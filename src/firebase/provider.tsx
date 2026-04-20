'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isPreviewMode: boolean;
  loginAsMockUser: () => void;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isPreviewMode: boolean;
  loginAsMockUser: () => void;
}

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isPreviewMode: boolean;
  loginAsMockUser: () => void;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// Dummy user for preview mode
export const DUMMY_USER_ID = 'preview-user-123';
const DUMMY_USER = {
  uid: DUMMY_USER_ID,
  displayName: 'Preview User',
  email: 'preview@example.com',
  photoURL: 'https://picsum.photos/seed/user/200/200',
  isAnonymous: true,
  emailVerified: true,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'dummy-token',
  getIdTokenResult: async () => ({}) as any,
  reload: async () => {},
  toJSON: () => ({}),
} as unknown as User;

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [mockUser, setMockUser] = useState<User | null>(null);

  // 環境判定を初期化時に行う
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      // Firebase Studio プレビュー環境のドメイン判定
      const isStudioPreview =
        hostname.includes("cloudworkstations.dev") ||
        hostname === "studio.firebase.google.com";
      
      setIsPreviewMode(isStudioPreview);
      console.log("FirebaseProvider: Environment check", { hostname, isStudioPreview });

      // セッションストレージからモックログイン状態を復元
      if (isStudioPreview && sessionStorage.getItem('isMockLoggedIn') === 'true') {
        console.log("FirebaseProvider: Restoring mock user session");
        setMockUser(DUMMY_USER);
        setUserAuthState({ user: DUMMY_USER, isUserLoading: false, userError: null });
      }
    }
  }, []);

  // Authステート監視
  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        console.log("FirebaseProvider: onAuthStateChanged", { uid: firebaseUser?.uid });
        // モックセッション中でない場合のみSDK側のステートを優先
        if (!sessionStorage.getItem('isMockLoggedIn')) {
          setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        if (!sessionStorage.getItem('isMockLoggedIn')) {
          setUserAuthState({ user: null, isUserLoading: false, userError: error });
        }
      }
    );
    return () => unsubscribe();
  }, [auth]);

  const loginAsMockUser = () => {
    // プレビュー環境でのみモックログインを許可
    if (isPreviewMode) {
      console.log("FirebaseProvider: Manual mock login triggered");
      setMockUser(DUMMY_USER);
      sessionStorage.setItem('isMockLoggedIn', 'true');
      setUserAuthState({ user: DUMMY_USER, isUserLoading: false, userError: null });
    }
  };

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    const currentUser = mockUser || userAuthState.user;
    const loading = userAuthState.isUserLoading;

    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: currentUser,
      isUserLoading: loading,
      userError: userAuthState.userError,
      isPreviewMode,
      loginAsMockUser,
    };
  }, [firebaseApp, firestore, auth, userAuthState, isPreviewMode, mockUser]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    isPreviewMode: context.isPreviewMode,
    loginAsMockUser: context.loginAsMockUser,
  };
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError, isPreviewMode, loginAsMockUser } = useFirebase();
  return { user, isUserLoading, userError, isPreviewMode, loginAsMockUser };
};
