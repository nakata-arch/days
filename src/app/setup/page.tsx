"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirestore, useUser, DUMMY_USER_ID } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Mission, Role, MAX_ROLES } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Trash2,
  Target,
  LogIn,
  ArrowRight,
  Compass,
} from "lucide-react";
import Link from "next/link";

function newRole(): Role {
  return { id: crypto.randomUUID(), name: "", goal: "" };
}

export default function SetupPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [roles, setRoles] = useState<Role[]>([newRole()]);
  const [weeklyFocus, setWeeklyFocus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // 既存のミッションを読み込む（編集モード判定）
  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (user.uid === DUMMY_USER_ID) {
        setLoading(false);
        return;
      }

      try {
        const missionRef = doc(db, "users", user.uid, "mission", "current");
        const snap = await getDoc(missionRef);
        if (snap.exists()) {
          const data = snap.data() as Mission;
          if (data.roles && data.roles.length > 0) {
            setRoles(data.roles);
          }
          setWeeklyFocus(data.weeklyFocus || "");
          setIsEditMode(true);
        }
      } catch (e) {
        console.error("SetupPage: load error", e);
      } finally {
        setLoading(false);
      }
    };
    if (!isUserLoading) load();
  }, [user, isUserLoading, db]);

  const handleAddRole = () => {
    if (roles.length >= MAX_ROLES) return;
    setRoles((prev) => [...prev, newRole()]);
  };

  const handleRemoveRole = (id: string) => {
    setRoles((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const handleChangeRole = (id: string, field: "name" | "goal", value: string) => {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const canSave =
    roles.length > 0 &&
    roles.every((r) => r.name.trim().length > 0) &&
    !saving;

  const handleSave = async () => {
    if (!user || !canSave) return;

    const sanitized: Role[] = roles.map((r) => ({
      id: r.id,
      name: r.name.trim(),
      goal: r.goal.trim(),
    }));

    const mission: Mission = {
      roles: sanitized,
      weeklyFocus: weeklyFocus.trim(),
      updatedAt: Date.now(),
    };

    setSaving(true);

    if (user.uid === DUMMY_USER_ID) {
      toast({ title: "保存しました（プレビュー）", description: "ミッションを記録しました。" });
      router.replace("/settings");
      return;
    }

    try {
      const missionRef = doc(db, "users", user.uid, "mission", "current");
      await setDoc(missionRef, mission, { merge: true });
      toast({ title: "保存しました", description: "ミッションを記録しました。" });
      router.replace("/settings");
    } catch (e: any) {
      console.error("SetupPage: save error", e);
      toast({
        variant: "destructive",
        title: "保存に失敗しました",
        description: "通信環境を確認してから再度お試しください。",
      });
      setSaving(false);
    }
  };

  if (isUserLoading || loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center gap-6">
        <Compass className="h-12 w-12 mx-auto opacity-20" />
        <p className="text-sm font-bold">ログインが必要です</p>
        <Button asChild className="rounded-full px-8 gap-2 font-bold">
          <Link href="/">
            <LogIn className="h-4 w-4" /> ログイン画面へ
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="px-8 pt-16 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/5">
            <Compass className="text-primary/40 h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-headline font-bold text-foreground/70">
              {isEditMode ? "ミッションを編集" : "あなたのミッション"}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40 mt-1">
              Setup your compass
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          あなたが大切にしたい役割と目標を書き出しましょう。
          時間の使い方を整える「北極星」になります。
        </p>
      </header>

      <main className="px-8 mt-10 space-y-8">
        {/* 役割セクション */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-primary/40">
              <Target className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">役割と目標</span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground/40">
              {roles.length} / {MAX_ROLES}
            </span>
          </div>

          <div className="space-y-4">
            {roles.map((role, index) => (
              <Card key={role.id} className="border-none shadow-sm bg-white rounded-[1.5rem] overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                      Role #{index + 1}
                    </span>
                    {roles.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRole(role.id)}
                        className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`role-name-${role.id}`} className="text-[11px] font-bold text-foreground/60">
                      役割
                    </Label>
                    <Input
                      id={`role-name-${role.id}`}
                      placeholder="例: 父親として / 管理職として"
                      value={role.name}
                      onChange={(e) => handleChangeRole(role.id, "name", e.target.value)}
                      className="h-12 rounded-xl bg-primary/[0.02] border-primary/5 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`role-goal-${role.id}`} className="text-[11px] font-bold text-foreground/60">
                      長期目標
                    </Label>
                    <Input
                      id={`role-goal-${role.id}`}
                      placeholder="例: 家族との時間を週10時間確保する"
                      value={role.goal}
                      onChange={(e) => handleChangeRole(role.id, "goal", e.target.value)}
                      className="h-12 rounded-xl bg-primary/[0.02] border-primary/5 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            {roles.length < MAX_ROLES && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddRole}
                className="w-full h-14 rounded-2xl gap-2 font-bold bg-white/50 border-primary/5 hover:bg-white border-dashed"
              >
                <Plus className="h-4 w-4 opacity-60" />
                役割を追加
              </Button>
            )}
          </div>
        </section>

        {/* 今週のフォーカス */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary/40 px-2">
            <Compass className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">今週のフォーカス</span>
          </div>

          <Card className="border-none shadow-sm bg-white rounded-[1.5rem] overflow-hidden">
            <CardContent className="p-6">
              <Textarea
                placeholder="今週、特に意識したいことを書いてみましょう。&#10;（1〜3行でOK）"
                value={weeklyFocus}
                onChange={(e) => setWeeklyFocus(e.target.value)}
                className="min-h-[100px] bg-primary/[0.02] border-primary/5 rounded-xl resize-none text-sm leading-relaxed"
              />
            </CardContent>
          </Card>
        </section>

        {/* 保存ボタン */}
        <div className="pt-2 space-y-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full h-14 rounded-2xl gap-3 text-base font-bold"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
            {isEditMode ? "ミッションを更新" : "保存して始める"}
          </Button>

          {isEditMode && (
            <Button asChild variant="ghost" className="w-full h-12 rounded-2xl text-muted-foreground/60 font-bold">
              <Link href="/settings">キャンセル</Link>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
