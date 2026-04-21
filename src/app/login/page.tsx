"use client";

import { useEffect, useState, useCallback } from "react";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, googleProvider } from "@/firebase";
import { useFirestore, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, LogIn, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { user, isUserLoading, isPreviewMode, loginAsMockUser } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resolvePostLoginRoute = useCallback(
    async (uid: string): Promise<"/setup" | "/settings"> => {
      if (isPreviewMode) return "/settings";
      try {
        const missionSnap = await getDoc(doc(db, "users", uid, "mission", "current"));
        return missionSnap.exists() ? "/settings" : "/setup";
      } catch (e) {
        console.error("LoginPage: mission check error", e);
        return "/settings";
      }
    },
    [db, isPreviewMode]
  );

  useEffect(() => {
    if (user && !isUserLoading) {
      resolvePostLoginRoute(user.uid).then((path) => {
        router.replace(path);
      });
    }
  }, [user, isUserLoading, router, resolvePostLoginRoute]);

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const path = await resolvePostLoginRoute(result.user.uid);
      router.replace(path);
    } catch (error: any) {
      console.error("LoginPage: Popup login error", error);
      if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
        // no-op
      } else if (error.code === "auth/popup-blocked") {
        setErrorMessage("ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。");
      } else {
        setErrorMessage(`Googleログインに失敗しました: ${error.message}`);
      }
      setLoading(false);
    }
  };

  const handlePreviewBypass = () => {
    setLoading(true);
    loginAsMockUser();
    setTimeout(() => {
      router.replace("/settings");
    }, 100);
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="animate-spin opacity-20 h-8 w-8 text-slate-400" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-[0.03] z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
      </div>

      <div className="mx-auto max-w-xl w-full space-y-12 text-center relative z-10">
        <div className="space-y-6">
          <div className="w-16 h-16 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto border border-blue-100/50">
            <Sparkles className="text-blue-500 h-8 w-8" />
          </div>
          <h1 className="text-5xl font-bold text-slate-800 tracking-tight font-headline">DAYS</h1>
          <p className="text-lg leading-relaxed text-slate-500 font-medium">
            予定を振り返り、<br />
            時間の使い方を優しく整える場所。
          </p>
        </div>

        <div className="space-y-4">
          {isPreviewMode ? (
            <button
              type="button"
              onClick={handlePreviewBypass}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-6 py-5 text-lg font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
              プレビューモードで開始
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-blue-500 px-6 py-5 text-lg font-bold text-white transition-all hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              Googleでログイン
            </button>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-600 whitespace-pre-wrap">
              {errorMessage}
            </div>
          )}

          <a
            href="/"
            className="block pt-2 text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← DAYSについて
          </a>

          <p className="pt-4 text-[10px] text-slate-400 leading-relaxed">
            ログインすることで、
            <a href="/privacy" className="underline hover:text-slate-600">プライバシーポリシー</a>
            に同意したものとみなされます。
          </p>
        </div>

        <div className="pt-8 opacity-20">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-slate-400">
            Time Management Coach
          </p>
        </div>
      </div>
    </main>
  );
}
