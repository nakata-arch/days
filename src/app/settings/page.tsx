"use client";

import { useState, useCallback, useMemo } from "react";
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase, googleProvider } from "@/firebase";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, collection, query } from "firebase/firestore";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { AppEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  RefreshCw,
  User as UserIcon,
  ClipboardCheck,
  ListTodo,
  Loader2,
  LogIn,
  Compass,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { isBefore, parseISO } from "date-fns";
import { CALENDAR_TOKEN_KEY } from "@/lib/calendar-writeback";

export default function SettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading, isPreviewMode } = useUser();
  const { toast } = useToast();

  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "saving" | "success" | "failed">("idle");

  // Firestoreから予定をリアルタイム購読（件数が即時反映される）
  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users", user.uid, "events"));
  }, [user, db]);
  const { data: allEventsData, isLoading: isCountsLoading } = useCollection<AppEvent>(eventsQuery);

  const counts = useMemo(() => {
    if (!allEventsData) return { report: 0, classify: 0 };
    const now = new Date();
    const filtered = allEventsData.filter((e) => !e.deleted);
    return {
      report: filtered.filter((e) => {
        if (e.reportStatus) return false;
        try {
          return isBefore(parseISO(e.startAt), now);
        } catch {
          return false;
        }
      }).length,
      classify: filtered.filter((e) => !e.quadrantCategory).length,
    };
  }, [allEventsData]);

  const processSync = useCallback(
    async (accessToken: string) => {
      if (!user) return;
      setSyncStatus("saving");
      try {
        const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const params = new URLSearchParams({
          timeMin,
          timeMax,
          timeZone: "Asia/Tokyo",
          maxResults: "100",
          singleEvents: "true",
          orderBy: "startTime",
        });

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const apiMessage = body.error?.message || response.statusText;

          if (response.status === 401) throw new Error("AUTH_EXPIRED");
          if (response.status === 403) throw new Error("PERMISSION_DENIED");
          if (response.status === 429) throw new Error("RATE_LIMITED");
          throw new Error(`API_ERROR:${apiMessage}`);
        }

        const body = await response.json();
        const items: any[] = body.items || [];

        const now = Date.now();
        for (const ev of items) {
          const eventRef = doc(db, "users", user.uid, "events", ev.id);
          await setDoc(
            eventRef,
            {
              id: ev.id,
              userId: user.uid,
              googleEventId: ev.id,
              title: ev.summary || "(タイトルなし)",
              description: ev.description || "",
              startAt: ev.start?.dateTime || ev.start?.date,
              endAt: ev.end?.dateTime || ev.end?.date,
              calendarName: "Google Calendar",
              syncStatus: "synced",
              deleted: false,
              source: "google_calendar",
              lastSyncedAt: now,
              updatedAt: now,
              isReported: false,
            },
            { merge: true }
          );
        }

        setSyncStatus("success");
        toast({ title: "同期完了", description: `${items.length}件の予定を同期しました（最大100件）。` });
        setTimeout(() => setSyncStatus("idle"), 3000);
      } catch (err: any) {
        console.error("SettingsPage: sync process error", err);
        setSyncStatus("failed");

        const code: string = err?.message || "";
        if (code === "AUTH_EXPIRED") {
          // 期限切れトークンを破棄し、ポップアップで再認証
          sessionStorage.removeItem(CALENDAR_TOKEN_KEY);
          toast({
            title: "再認証しています",
            description: "Googleカレンダーの認証が切れたため、再ログインします。",
          });
          try {
            const result = await signInWithPopup(auth, googleProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const newToken = credential?.accessToken;
            if (newToken) {
              sessionStorage.setItem(CALENDAR_TOKEN_KEY, newToken);
              processSync(newToken);
            } else {
              setSyncStatus("failed");
            }
          } catch (e) {
            console.error("SettingsPage: re-auth popup failed", e);
            setSyncStatus("failed");
          }
          return;
        } else if (code === "PERMISSION_DENIED") {
          toast({
            variant: "destructive",
            title: "権限が不足しています",
            description: "Googleカレンダーへのアクセス権限を許可してください。",
          });
        } else if (code === "RATE_LIMITED") {
          toast({
            variant: "destructive",
            title: "一時的に混み合っています",
            description: "少し時間をおいてから再度お試しください。",
          });
        } else if (code.startsWith("API_ERROR:")) {
          toast({
            variant: "destructive",
            title: "同期に失敗しました",
            description: code.replace("API_ERROR:", ""),
          });
        } else {
          toast({
            variant: "destructive",
            title: "同期に失敗しました",
            description: "ネットワーク接続を確認してから再度お試しください。",
          });
        }
      }
    },
    [user, db, toast, auth]
  );

  const handleSyncTrigger = async () => {
    if (!user) return;
    if (isPreviewMode) {
      toast({
        variant: "destructive",
        title: "プレビュー制限",
        description: "Google同期には本番環境でのログインが必要です。",
      });
      return;
    }

    // 保存済みトークンがあればそれを使って同期（ポップアップ不要）
    const cached = sessionStorage.getItem(CALENDAR_TOKEN_KEY);
    if (cached) {
      // 期限切れの場合は processSync 内で AUTH_EXPIRED → 自動再認証
      processSync(cached);
      return;
    }

    // 初回または手動クリア後はポップアップで取得
    setSyncStatus("syncing");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      if (accessToken) {
        sessionStorage.setItem(CALENDAR_TOKEN_KEY, accessToken);
        processSync(accessToken);
      } else {
        setSyncStatus("failed");
        toast({
          variant: "destructive",
          title: "認証情報の取得に失敗しました",
          description: "もう一度お試しください。",
        });
      }
    } catch (error: any) {
      console.error("SettingsPage: signInWithPopup error", error);
      setSyncStatus("failed");
      if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/cancelled-popup-request") {
        toast({
          variant: "destructive",
          title: "ログインに失敗しました",
          description: error.code === "auth/popup-blocked"
            ? "ポップアップがブロックされました。ブラウザ設定を確認してください。"
            : error.message,
        });
      }
    }
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("isMockLoggedIn");
      sessionStorage.removeItem(CALENDAR_TOKEN_KEY);
      await auth.signOut();
      router.replace("/");
    } catch (error) {
      console.error("SettingsPage: logout error", error);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">ユーザー情報を確認しています...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center gap-6">
        <UserIcon className="h-12 w-12 mx-auto opacity-20" />
        <p className="text-sm font-bold">ログインが必要です</p>
        <Button asChild className="rounded-full px-8 gap-2 font-bold">
          <Link href="/"><LogIn className="h-4 w-4" /> ログイン画面へ</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-8 pt-16" />

      <main className="px-8 space-y-10">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-4 ring-white shadow-sm shrink-0">
            <AvatarImage src={user.photoURL || ""} />
            <AvatarFallback>
              <UserIcon className="h-8 w-8 opacity-20" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-xl font-bold truncate tracking-tight text-foreground/80">{user.displayName || "User"}</h3>
            <p className="text-[10px] text-muted-foreground opacity-60 truncate uppercase font-bold tracking-widest">{user.email || "Account"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/report" className="block">
            <Card className="border-none bg-primary/5 shadow-sm rounded-3xl hover:bg-primary/10 transition-colors">
              <CardContent className="p-6 space-y-1">
                <div className="flex items-center gap-2 text-primary/40">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">未報告</span>
                </div>
                <p className="text-3xl font-bold tracking-tighter text-primary/80">
                  {isCountsLoading ? <Loader2 className="h-6 w-6 animate-spin opacity-20" /> : counts.report}
                  <span className="text-xs font-normal ml-1 opacity-40">件</span>
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/classify" className="block">
            <Card className="border-none bg-primary/5 shadow-sm rounded-3xl hover:bg-primary/10 transition-colors">
              <CardContent className="p-6 space-y-1">
                <div className="flex items-center gap-2 text-primary/40">
                  <ListTodo className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">未分類</span>
                </div>
                <p className="text-3xl font-bold tracking-tighter text-primary/80">
                  {isCountsLoading ? <Loader2 className="h-6 w-6 animate-spin opacity-20" /> : counts.classify}
                  <span className="text-xs font-normal ml-1 opacity-40">件</span>
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Link href="/setup" className="block">
          <Card className="border-none shadow-sm bg-white rounded-3xl hover:bg-primary/[0.02] transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center shrink-0">
                <Compass className="text-primary/40 h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-bold text-foreground/70">ミッションを編集</p>
                <p className="text-[10px] text-muted-foreground opacity-60 font-bold uppercase tracking-widest">
                  Role / Goal / Weekly Focus
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-primary/20 shrink-0" />
            </CardContent>
          </Card>
        </Link>

        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleSyncTrigger}
            disabled={syncStatus === "syncing" || syncStatus === "saving"}
            variant="outline"
            className="w-full h-14 rounded-2xl gap-3 font-bold bg-white/50 border-primary/5 hover:bg-white transition-all shadow-sm"
          >
            <RefreshCw className={syncStatus === "syncing" || syncStatus === "saving" ? "animate-spin h-4 w-4" : "h-4 w-4 opacity-40"} />
            {syncStatus === "saving" ? "保存中..." : "カレンダーを同期する"}
          </Button>

          <Button
            type="button"
            onClick={handleLogout}
            variant="ghost"
            className="w-full h-12 rounded-2xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 font-bold"
          >
            <LogOut className="h-4 w-4 mr-2 opacity-40" />
            ログアウト
          </Button>
        </div>
      </main>

      <Navigation />
    </div>
  );
}
