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
      <div className="flex h-screen flex-col items-center justify-center bg-paper gap-4">
        <Loader2 className="animate-spin opacity-30 h-8 w-8 text-ink-faint" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 py-10">
      <div className="mx-auto max-w-xl w-full space-y-14 text-center">
        <div className="space-y-5">
          <div className="font-latin text-[13px] italic text-[hsl(var(--accent))] tracking-[0.2em]">
            Welcome Back
          </div>
          <h1 className="text-5xl font-headline font-semibold text-ink tracking-wide">DAYS</h1>
          <p className="text-[15px] leading-[2] text-ink-soft max-w-md mx-auto">
            予定を振り返り、<br />
            時間の使い方を、そっと整える場所。
          </p>
        </div>

        <div className="space-y-6">
          {isPreviewMode ? (
            <button
              type="button"
              onClick={handlePreviewBypass}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-ink px-6 py-5 text-base font-sans font-medium text-paper tracking-[0.2em] border border-ink transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
              プレビューモードで開始
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-ink px-6 py-5 text-base font-sans font-medium text-paper tracking-[0.2em] border border-ink transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              Googleでログイン
            </button>
          )}

          {errorMessage && (
            <div className="border border-[hsl(var(--accent))] bg-paper-warm px-4 py-3 text-xs text-[hsl(var(--accent))] leading-relaxed whitespace-pre-wrap text-left">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3 pt-4">
            <a
              href="/"
              className="block font-sans text-[11px] uppercase tracking-[0.3em] text-ink-faint hover:text-ink transition-colors"
            >
              ← DAYSについて
            </a>
            <p className="text-[11px] text-ink-faint leading-relaxed">
              ログインすることで、
              <a href="/privacy" className="underline underline-offset-2 text-[hsl(var(--accent))] hover:text-ink">プライバシーポリシー</a>
              に同意したものとみなされます。
            </p>
          </div>
        </div>

        <div className="pt-4">
          <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-ink-faint opacity-50">
            Time Management Coach
          </p>
        </div>
      </div>
    </main>
  );
}
