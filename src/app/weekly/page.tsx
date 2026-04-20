
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, setDoc, serverTimestamp, where } from "firebase/firestore";
import { AppEvent, Mission, QuadrantCategory, Summary } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Sparkles,
  Heart,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Save,
  Mic,
  Square,
  Wand2,
  Clock,
  MessageSquare,
  BarChart3,
  LogIn,
  Compass,
  Filter,
} from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
  isWithinInterval,
  parseISO,
  isSameDay,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import { ja } from "date-fns/locale";
import { aiWeeklyPraiseFeedback, type PraiseFeedbackOutput } from "@/ai/flows/ai-weekly-praise-feedback";
import { refineReflection } from "@/ai/flows/ai-refine-reflection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QUADRANTS } from "@/lib/mock-data";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

type MainTabType = 'diary' | 'aggregate';
type SubTabType = 'weekly' | 'monthly' | 'yearly' | 'custom';

export default function DiaryPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<MainTabType>('diary');
  const [subTab, setSubTab] = useState<SubTabType>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [praiseResult, setPraiseResult] = useState<PraiseFeedbackOutput | null>(null);
  const [isPraiseLoading, setIsPraiseLoading] = useState(false);
  const [dailyMemo, setDailyMemo] = useState("");
  const [isSavingMemo, setIsSavingMemo] = useState(false);

  // カスタム期間
  const today = useMemo(() => new Date(), []);
  const [customStart, setCustomStart] = useState<string>(() =>
    format(subDays(today, 7), "yyyy-MM-dd")
  );
  const [customEnd, setCustomEnd] = useState<string>(() => format(today, "yyyy-MM-dd"));

  // 録音関連のステート
  const [isRecording, setIsRecording] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 全予定の取得
  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "users", user.uid, "events"),
      orderBy("startAt", "desc")
    );
  }, [user, db]);

  const { data: allEvents, isLoading: isEventsLoading } = useCollection<AppEvent>(eventsQuery);

  // ミッションの取得
  const missionRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "users", user.uid, "mission", "current");
  }, [user, db]);
  const { data: missionDoc } = useDoc<Mission>(missionRef);

  // 日次サマリー（日記メモ）一覧の取得
  const dailySummariesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "users", user.uid, "summaries"),
      where("summaryType", "==", "daily")
    );
  }, [user, db]);
  const { data: allDailySummaries } = useCollection<Summary>(dailySummariesQuery);

  // 日記メモ（Summaryエンティティのdailyタイプ）の取得
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dailySummaryRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "users", user.uid, "summaries", `daily-${dateStr}`);
  }, [user, db, dateStr]);

  const { data: dailySummaryDoc } = useDoc<Summary>(dailySummaryRef);

  useEffect(() => {
    if (dailySummaryDoc) {
      setDailyMemo(dailySummaryDoc.summaryText || "");
    } else {
      setDailyMemo("");
    }
  }, [dailySummaryDoc]);

  const handleSaveDailyMemo = async () => {
    if (!user || !dailySummaryRef) return;
    setIsSavingMemo(true);
    try {
      await setDoc(dailySummaryRef, {
        id: `daily-${dateStr}`,
        userId: user.uid,
        summaryType: 'daily',
        startDate: dateStr,
        endDate: dateStr,
        summaryText: dailyMemo,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast({ title: "保存しました", description: "日記を更新しました。" });
    } catch (e) {
      console.error("Save daily memo failed:", e);
      toast({ variant: "destructive", title: "エラー", description: "保存に失敗しました。" });
    } finally {
      setIsSavingMemo(false);
    }
  };

  const startRecording = async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast({
        variant: 'destructive',
        title: '録音できません',
        description: 'このブラウザは録音に対応していません。Safari や Chrome の最新版でお試しください。',
      });
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      toast({
        variant: 'destructive',
        title: '録音できません',
        description: 'このブラウザは MediaRecorder に未対応です。',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // ブラウザがサポートする mimeType を自動選択（iOS Safari は audio/webm 非対応）
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
      ];
      const supported = candidates.find((t) => MediaRecorder.isTypeSupported(t));
      const mediaRecorder = supported ? new MediaRecorder(stream, { mimeType: supported }) : new MediaRecorder(stream);
      const recordedType = mediaRecorder.mimeType || supported || 'audio/webm';

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onerror = (e: any) => {
        console.error('MediaRecorder error:', e.error || e);
        toast({
          variant: 'destructive',
          title: '録音エラー',
          description: String(e.error?.message || e.error || 'unknown'),
        });
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recordedType });
        if (blob.size === 0) {
          toast({ variant: 'destructive', title: '録音エラー', description: '音声を取得できませんでした。' });
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          handleRefine(base64Audio);
        };
        reader.onerror = () => {
          toast({ variant: 'destructive', title: '録音エラー', description: '音声の読み取りに失敗しました。' });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      const msg =
        err?.name === 'NotAllowedError'
          ? 'マイクへのアクセスが拒否されました。ブラウザの設定で許可してください。'
          : err?.name === 'NotFoundError'
            ? 'マイクが見つかりません。デバイスを確認してください。'
            : err?.message || 'マイクを起動できませんでした。';
      toast({ variant: 'destructive', title: '録音エラー', description: msg });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRefine = async (audioDataUri?: string) => {
    setIsRefining(true);
    try {
      const result = await refineReflection({
        text: audioDataUri ? undefined : dailyMemo,
        audioDataUri
      });
      setDailyMemo(result.refinedText);
      toast({ title: audioDataUri ? "聞き取りました" : "AIが整えました", description: "日記を清書しました。" });
    } catch (err) {
      console.error("Refine failed:", err);
      toast({ variant: "destructive", title: "AI整形エラー", description: "うまく文章を整えられませんでした。" });
    } finally {
      setIsRefining(false);
    }
  };

  const getPeriodRange = (type: SubTabType, referenceDate: Date): { start: Date; end: Date } => {
    switch (type) {
      case 'weekly':
        return {
          start: startOfWeek(referenceDate, { weekStartsOn: 1 }),
          end: endOfWeek(referenceDate, { weekStartsOn: 1 }),
        };
      case 'monthly':
        return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
      case 'yearly':
        return { start: startOfYear(referenceDate), end: endOfYear(referenceDate) };
      case 'custom': {
        try {
          const s = startOfDay(parseISO(customStart));
          const e = endOfDay(parseISO(customEnd));
          if (e < s) return { start: e, end: s };
          return { start: s, end: e };
        } catch {
          return { start: startOfDay(referenceDate), end: endOfDay(referenceDate) };
        }
      }
    }
  };

  const getPeriodLabels = (type: SubTabType, referenceDate: Date): { periodLabel: string; nextPeriodLabel: string } => {
    const range = getPeriodRange(type, referenceDate);
    switch (type) {
      case 'weekly':
        return { periodLabel: '今週', nextPeriodLabel: '来週' };
      case 'monthly':
        return { periodLabel: '今月', nextPeriodLabel: '来月' };
      case 'yearly':
        return { periodLabel: '今年', nextPeriodLabel: '来年' };
      case 'custom':
        return {
          periodLabel: `${format(range.start, 'yyyy年M月d日')}〜${format(range.end, 'M月d日')}`,
          nextPeriodLabel: 'これから',
        };
    }
  };

  const periodEvents = useMemo(() => {
    if (!allEvents) return [];
    if (mainTab === 'diary') {
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);
      return allEvents.filter(e => {
        try {
          const date = parseISO(e.startAt);
          return isWithinInterval(date, { start, end });
        } catch { return false; }
      });
    }
    const range = getPeriodRange(subTab, selectedDate);
    return allEvents.filter(e => {
      try {
        const date = parseISO(e.startAt);
        return isWithinInterval(date, range);
      } catch { return false; }
    });
  }, [allEvents, mainTab, subTab, selectedDate, customStart, customEnd]);

  const stats = useMemo(() => {
    return {
      total: periodEvents.length,
      done: periodEvents.filter(e => e.reportStatus === 'done').length,
      failed: periodEvents.filter(e => e.reportStatus === 'failed').length,
      cancelled: periodEvents.filter(e => e.reportStatus === 'cancelled').length,
      deferred: periodEvents.filter(e => e.reportStatus === 'deferred').length,
    };
  }, [periodEvents]);

  // 期間が変わったら励ましフィードバックをリセット（再生成はユーザー操作）
  useEffect(() => {
    setPraiseResult(null);
  }, [mainTab, subTab, selectedDate, customStart, customEnd]);

  // 期間内の日記メモを連結
  const periodUserComment = useMemo(() => {
    if (!allDailySummaries || mainTab !== 'aggregate') return '';
    const range = getPeriodRange(subTab, selectedDate);
    return allDailySummaries
      .filter((s) => {
        try {
          const d = parseISO(s.startDate);
          return isWithinInterval(d, range);
        } catch {
          return false;
        }
      })
      .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
      .map((s) => s.summaryText?.trim())
      .filter(Boolean)
      .join('\n---\n');
  }, [allDailySummaries, mainTab, subTab, selectedDate, customStart, customEnd]);

  const handleGeneratePraise = async () => {
    if (!user) return;

    setIsPraiseLoading(true);
    try {
      const { periodLabel, nextPeriodLabel } = getPeriodLabels(subTab, selectedDate);
      const total = periodEvents.length;
      const quad = {
        a: periodEvents.filter((e) => e.quadrantCategory === 'urgent_important').length,
        b: periodEvents.filter((e) => e.quadrantCategory === 'not_urgent_important').length,
        c: periodEvents.filter((e) => e.quadrantCategory === 'urgent_not_important').length,
        d: periodEvents.filter((e) => e.quadrantCategory === 'not_urgent_not_important').length,
      };
      const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

      const result = await aiWeeklyPraiseFeedback({
        mission: {
          roles: missionDoc?.roles?.map((r) => ({ name: r.name, goal: r.goal })) ?? [],
          weeklyFocus: missionDoc?.weeklyFocus ?? '',
        },
        periodLabel,
        nextPeriodLabel,
        quadrantPercents: { a: pct(quad.a), b: pct(quad.b), c: pct(quad.c), d: pct(quad.d) },
        doneCount: stats.done,
        notDoneCount: stats.failed + stats.cancelled,
        userComment: periodUserComment,
      });
      setPraiseResult(result);
    } catch (err) {
      console.error('weekly:praise-generate-error', err);
      toast({
        variant: 'destructive',
        title: '生成に失敗しました',
        description: '通信環境を確認してから再度お試しください。',
      });
    } finally {
      setIsPraiseLoading(false);
    }
  };

  const dateLabel = useMemo(() => {
    const now = new Date();
    if (isSameDay(selectedDate, now)) return "今日";
    if (isSameDay(selectedDate, subDays(now, 1))) return "昨日";
    if (isSameDay(selectedDate, addDays(now, 1))) return "明日";
    return format(selectedDate, "E", { locale: ja });
  }, [selectedDate]);

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
        <div className="space-y-2 opacity-40">
          <BookOpen className="h-12 w-12 mx-auto" />
          <p className="text-sm font-bold">ログインが必要です</p>
          <p className="text-[10px] uppercase tracking-widest">Please sign in to write diary</p>
        </div>
        <Button asChild className="rounded-full px-8 gap-2 font-bold">
          <Link href="/"><LogIn className="h-4 w-4" /> ログイン画面へ</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="px-8 pt-16 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/5">
            {mainTab === 'diary' ? <BookOpen className="text-primary/40 h-5 w-5" /> : <BarChart3 className="text-primary/40 h-5 w-5" />}
          </div>
          <h1 className="text-xl font-headline font-bold text-foreground/70">{mainTab === 'diary' ? '日記' : '集計'}</h1>
        </div>

        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTabType)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-primary/5 rounded-2xl h-12 p-1 border-none">
            <TabsTrigger value="diary" className="rounded-xl text-[10px] font-bold tracking-widest uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm">日記</TabsTrigger>
            <TabsTrigger value="aggregate" className="rounded-xl text-[10px] font-bold tracking-widest uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm">集計</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main className="px-8 mt-8">
        <Tabs value={mainTab}>
          <TabsContent value="diary" className="space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 日付ナビゲーション */}
            <div className="flex items-center justify-between bg-white/50 p-2 rounded-[2rem] shadow-sm">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                <ChevronLeft className="h-5 w-5 opacity-40" />
              </Button>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">{dateLabel}</span>
                <span className="text-sm font-bold text-foreground/70">{format(selectedDate, "yyyy年 M月d日", { locale: ja })}</span>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                <ChevronRight className="h-5 w-5 opacity-40" />
              </Button>
            </div>

            {/* 日次サマリー */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '予定', val: stats.total, color: 'text-primary/60' },
                { label: 'できた', val: stats.done, color: 'text-emerald-600' },
                { label: '保留', val: stats.deferred, color: 'text-amber-600' },
                { label: '未達', val: stats.failed, color: 'text-rose-600' },
              ].map((s) => (
                <Card key={s.label} className="border-none bg-white shadow-sm rounded-2xl">
                  <CardContent className="p-3 flex flex-col items-center">
                    <span className={`text-lg font-bold tracking-tighter ${s.color}`}>{s.val}</span>
                    <span className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-widest">{s.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 今日の日記メモ */}
            <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary/30">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">一日の振り返り</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 rounded-full transition-all ${isRecording ? 'text-rose-500 bg-rose-50 animate-pulse' : 'text-primary/40 hover:text-primary hover:bg-primary/5'}`}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isRefining}
                    >
                      {isRecording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-full text-primary/40 hover:text-primary hover:bg-primary/5"
                      onClick={() => handleRefine()}
                      disabled={isRecording || isRefining || !dailyMemo}
                    >
                      {isRefining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 rounded-full text-[10px] font-bold gap-2 text-primary/40 hover:text-primary hover:bg-primary/5"
                      onClick={handleSaveDailyMemo}
                      disabled={isSavingMemo || isRecording || isRefining}
                    >
                      {isSavingMemo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      保存
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Textarea 
                    placeholder={isRecording ? "録音中... お話しください。" : (isRefining ? "AIが文章を整えています..." : "今日はどんな日でしたか？ 感じたこと、残したいことを自由に書いてみましょう。")}
                    value={dailyMemo}
                    onChange={(e) => setDailyMemo(e.target.value)}
                    className="min-h-[160px] bg-primary/[0.02] border-none rounded-2xl resize-none text-sm leading-relaxed italic placeholder:text-muted-foreground/30 focus-visible:ring-primary/5"
                    disabled={isRefining}
                  />
                  {isRefining && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-2xl">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                        <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">AI Refining...</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* その日の予定一覧 */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.2em] px-2">今日の歩み</h3>
              {isEventsLoading ? (
                <div className="flex py-12 justify-center">
                  <Loader2 className="animate-spin opacity-10 h-6 w-6 text-primary" />
                </div>
              ) : periodEvents.length === 0 ? (
                <div className="text-center py-12 opacity-30 space-y-3">
                  <Clock className="h-8 w-8 mx-auto" />
                  <p className="text-xs">予定はありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {periodEvents.map((event) => (
                    <Card key={event.id} className="border-none shadow-sm bg-white/60 rounded-[1.5rem] overflow-hidden">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm truncate text-foreground/80">{event.title}</h4>
                              {event.quadrantCategory && (
                                <span className="text-[14px]" title={QUADRANTS[event.quadrantCategory]?.label}>
                                  {QUADRANTS[event.quadrantCategory]?.icon}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground opacity-60 font-medium">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(event.startAt), "HH:mm")}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[8px] uppercase px-2 h-5 rounded-full border-none font-bold ${
                              event.reportStatus === 'done' ? 'bg-emerald-50 text-emerald-600' :
                              event.reportStatus === 'failed' ? 'bg-rose-50 text-rose-600' :
                              event.reportStatus === 'deferred' ? 'bg-amber-50 text-amber-600' :
                              'bg-slate-50 text-slate-500'
                            }`}
                          >
                            {!event.reportStatus ? '未報告' :
                              event.reportStatus === 'done' ? 'できた' :
                              event.reportStatus === 'failed' ? '未達' :
                              event.reportStatus === 'deferred' ? '保留' : '中止'}
                          </Badge>
                        </div>
                        {event.reportMemo && (
                          <div className="flex gap-2 p-3 bg-primary/[0.02] rounded-xl border border-primary/[0.03]">
                            <MessageSquare className="h-3 w-3 text-primary/20 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-foreground/60 leading-relaxed italic">
                              {event.reportMemo}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="aggregate" className="space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 期間切り替え */}
            <div className="flex justify-center">
              <div className="inline-flex bg-primary/5 p-1 rounded-2xl border border-primary/5">
                {[
                  { id: 'weekly', label: '週間' },
                  { id: 'monthly', label: '月間' },
                  { id: 'yearly', label: '年間' },
                  { id: 'custom', label: 'カスタム' },
                ].map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSubTab(item.id as SubTabType)}
                    className={`h-9 rounded-xl text-[10px] font-bold tracking-widest uppercase px-4 transition-all ${subTab === item.id ? 'bg-white shadow-sm text-primary' : 'text-primary/40'}`}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* カスタム期間フィルター */}
            {subTab === 'custom' && (
              <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-primary/40">
                    <Filter className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">カスタム期間</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="custom-start" className="text-[10px] font-bold text-foreground/60">
                        開始日
                      </Label>
                      <Input
                        id="custom-start"
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="h-11 rounded-xl bg-primary/[0.02] border-primary/5 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-end" className="text-[10px] font-bold text-foreground/60">
                        終了日
                      </Label>
                      <Input
                        id="custom-end"
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="h-11 rounded-xl bg-primary/[0.02] border-primary/5 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 今期のあなたへ（AI励まし） */}
            <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary/40">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {subTab === 'weekly' && '今週のあなたへ ✨'}
                      {subTab === 'monthly' && '今月のあなたへ ✨'}
                      {subTab === 'yearly' && '今年のあなたへ ✨'}
                      {subTab === 'custom' && 'この期間のあなたへ ✨'}
                    </span>
                  </div>
                </div>

                {!missionDoc || !missionDoc.roles || missionDoc.roles.length === 0 ? (
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      まずはミッションを登録すると、<br />
                      あなたへの励ましを届けられます。
                    </p>
                    <Button asChild variant="outline" className="w-full h-12 rounded-2xl gap-2 font-bold">
                      <Link href="/setup">
                        <Compass className="h-4 w-4" />
                        ミッションを登録する
                      </Link>
                    </Button>
                  </div>
                ) : isPraiseLoading ? (
                  <div className="space-y-3 py-2">
                    <Skeleton className="h-4 w-full bg-primary/5" />
                    <Skeleton className="h-4 w-5/6 bg-primary/5" />
                    <Skeleton className="h-4 w-4/6 bg-primary/5" />
                    <div className="h-3" />
                    <Skeleton className="h-4 w-full bg-primary/5" />
                    <Skeleton className="h-4 w-3/4 bg-primary/5" />
                  </div>
                ) : praiseResult ? (
                  <div className="space-y-5">
                    <p className="text-sm font-medium leading-relaxed text-foreground/70">
                      {praiseResult.highlight}
                    </p>
                    <div className="p-5 bg-primary/5 rounded-2xl border border-primary/5">
                      <div className="flex items-center gap-2 text-primary/50 mb-2">
                        <Heart className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">ミッションとの接点</span>
                      </div>
                      <p className="text-sm text-foreground/70 leading-relaxed">
                        {praiseResult.missionLink}
                      </p>
                    </div>
                    <p className="text-base font-headline leading-relaxed text-primary/80 italic">
                      {praiseResult.encouragement}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGeneratePraise}
                      className="w-full h-10 rounded-2xl text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest"
                    >
                      もう一度生成する
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      ボタンを押すと、AIがこの期間の歩みを振り返り、あなたを励ますメッセージをお届けします。
                    </p>
                    <Button
                      onClick={handleGeneratePraise}
                      disabled={isPraiseLoading}
                      className="w-full h-12 rounded-2xl gap-2 font-bold"
                    >
                      <Sparkles className="h-4 w-4" />
                      励ましを生成する
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 集計サマリー */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none shadow-sm bg-white rounded-[2rem]">
                <CardContent className="p-6 flex flex-col items-center">
                  <span className="text-3xl font-bold text-primary/80 tracking-tighter">{periodEvents.length}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">過ごした時間</span>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white rounded-[2rem]">
                <CardContent className="p-6 flex flex-col items-center">
                  <span className="text-3xl font-bold text-primary/80 tracking-tighter">
                    {stats.done}
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">実を結んだこと</span>
                </CardContent>
              </Card>
            </div>

            {/* 四象限の内訳 */}
            {periodEvents.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.2em] px-2">時間の質</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(QUADRANTS) as [QuadrantCategory, any][]).map(([key, config]) => {
                    const count = periodEvents.filter(e => e.quadrantCategory === key).length;
                    return (
                      <Card key={key} className="border-none bg-white/40 shadow-sm rounded-2xl overflow-hidden">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{config.icon}</span>
                            <span className="text-[10px] font-bold text-foreground/60">{config.label}</span>
                          </div>
                          <span className="text-sm font-bold text-primary/60">{count}</span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Navigation />
    </div>
  );
}
