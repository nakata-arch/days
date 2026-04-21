"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser, useFirestore, DUMMY_USER_ID } from "@/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { AppEvent, ReportStatus } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  ClipboardCheck,
  LogIn,
  History,
  Edit3,
  PauseCircle,
} from "lucide-react";
import { format, parseISO, isBefore } from "date-fns";
import { ja } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { PREVIEW_EVENTS } from "@/lib/preview-data";
import { patchReportDescription } from "@/lib/calendar-writeback";
import { QuotePopup } from "@/components/QuotePopup";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  PanInfo,
} from "framer-motion";

type ExitDir = { x: number; y: number };

function ReportSwipeCard({
  event,
  exitDir,
  memo,
  onMemoChange,
  onReport,
}: {
  event: AppEvent;
  exitDir: ExitDir;
  memo: string;
  onMemoChange: (v: string) => void;
  onReport: (status: ReportStatus, exit: ExitDir) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-180, 0, 180], [-10, 0, 10]);

  const overlayOpacity = useTransform([x, y], ([lx, ly]) => {
    const nx = Number(lx);
    const ny = Number(ly);
    const dist = Math.max(Math.abs(nx), Math.abs(Math.min(ny, 0)));
    return Math.min(dist / 120, 0.75);
  });

  const activeLabel = useTransform([x, y], ([lx, ly]) => {
    const nx = Number(lx);
    const ny = Number(ly);
    if (Math.abs(nx) < 40 && Math.abs(ny) < 40) return "";
    if (ny < -40 && Math.abs(ny) >= Math.abs(nx)) return "保留";
    if (nx < -40) return "できた";
    if (nx > 40) return "未達";
    return "";
  });

  const activeColor = useTransform([x, y], ([lx, ly]) => {
    const nx = Number(lx);
    const ny = Number(ly);
    if (ny < -40 && Math.abs(ny) >= Math.abs(nx)) return "rgba(245, 158, 11, 0.8)";
    if (nx < -40) return "rgba(16, 185, 129, 0.8)";
    if (nx > 40) return "rgba(244, 63, 94, 0.8)";
    return "transparent";
  });

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 90;
    const { x: ox, y: oy } = info.offset;
    if (oy < -threshold && Math.abs(oy) >= Math.abs(ox)) {
      onReport("deferred", { x: 0, y: -1000 });
      return;
    }
    if (oy > threshold && Math.abs(oy) > Math.abs(ox)) {
      x.set(0);
      y.set(0);
      return;
    }
    if (ox < -threshold) {
      onReport("done", { x: -1000, y: 0 });
      return;
    }
    if (ox > threshold) {
      onReport("failed", { x: 1000, y: 0 });
      return;
    }
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{
        x: exitDir.x,
        y: exitDir.y,
        opacity: 0,
        scale: 0.6,
        transition: { duration: 0.3 },
        pointerEvents: "none",
      }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      style={{ x, y, rotate }}
      className="w-full relative z-10 touch-none"
    >
      <Card className="w-full border-none shadow-2xl bg-paper rounded-[2.5rem] overflow-hidden relative">
        <motion.div
          style={{ backgroundColor: activeColor, opacity: overlayOpacity }}
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        >
          <motion.span style={{ opacity: overlayOpacity }} className="text-2xl font-bold text-white drop-shadow-md">
            {activeLabel}
          </motion.span>
        </motion.div>

        <CardContent className="p-10 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary/40 truncate">
              <div className="w-2 h-2 rounded-full bg-primary/20" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{event.calendarName}</span>
            </div>
            <h2 className="text-2xl font-headline leading-tight text-foreground/80 line-clamp-3">{event.title}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
              <Clock className="h-4 w-4 shrink-0" />
              {format(parseISO(event.startAt), "M月d日(E) HH:mm", { locale: ja })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="h-px w-full bg-primary/[0.03]" />
            <Textarea
              placeholder="振り返りメモ..."
              value={memo}
              onChange={(e) => onMemoChange(e.target.value)}
              className="bg-primary/[0.01] border-none rounded-2xl resize-none text-sm min-h-[100px] focus-visible:ring-primary/5"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={() => onReport("done", { x: -1000, y: 0 })}
              className="h-16 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none flex-col gap-1"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-bold text-[11px]">できた</span>
            </Button>
            <Button
              onClick={() => onReport("deferred", { x: 0, y: -1000 })}
              className="h-16 rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-100 border-none flex-col gap-1"
            >
              <PauseCircle className="h-5 w-5" />
              <span className="font-bold text-[11px]">保留</span>
            </Button>
            <Button
              onClick={() => onReport("failed", { x: 1000, y: 0 })}
              className="h-16 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 border-none flex-col gap-1"
            >
              <XCircle className="h-5 w-5" />
              <span className="font-bold text-[11px]">未達</span>
            </Button>
          </div>

          <div className="text-center text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em]">
            ← できた / 上 保留 / 未達 →
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ReportPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [reportedEvents, setReportedEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [memo, setMemo] = useState("");
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  // exitアニメーションの方向（スワイプ方向に飛ばす）
  const [exitDir, setExitDir] = useState<ExitDir>({ x: 0, y: 0 });

  const fetchAllEvents = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    if (user.uid === DUMMY_USER_ID) {
      const all = PREVIEW_EVENTS;
      const now = new Date();
      const unreported = all.filter((e) => !e.reportStatus && isBefore(parseISO(e.startAt), now));
      const reported = all.filter((e) => !!e.reportStatus);
      setEvents(unreported);
      setReportedEvents(reported);
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const eventsRef = collection(db, "users", user.uid, "events");

      // 全件取得しクライアント側で「過去」を判定（タイムゾーン文字列比較の齟齬を避けるため）
      const q = query(eventsRef, orderBy("startAt", "desc"));

      const snap = await getDocs(q);
      const pastEvents = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as AppEvent))
        .filter((e) => !e.deleted)
        .filter((e) => {
          try {
            return isBefore(parseISO(e.startAt), now);
          } catch {
            return false;
          }
        });

      const unreported = pastEvents.filter((e) => !e.reportStatus);
      const reported = pastEvents.filter((e) => !!e.reportStatus);

      setEvents(unreported);
      setReportedEvents(reported);
    } catch (err: any) {
      console.error("ReportPage: fetch-error", err);
    } finally {
      setLoading(false);
    }
  }, [user, db]);

  useEffect(() => {
    if (!isUserLoading && user) {
      fetchAllEvents();
    }
  }, [user, isUserLoading, fetchAllEvents]);

  const handleReport = (status: ReportStatus, eventToUpdate: AppEvent, customMemo?: string, exit?: ExitDir) => {
    if (!user) return;

    const targetMemo = customMemo !== undefined ? customMemo : memo;

    // UIを先行して更新（スワイプ連続性のため同期処理）
    if (events.length > 0 && events[0].id === eventToUpdate.id) {
      if (exit) setExitDir(exit);
      setEvents((prev) => prev.slice(1));
      setMemo("");
    }

    const updatedEvent = {
      ...eventToUpdate,
      reportStatus: status,
      reportMemo: targetMemo,
      isReported: true,
      updatedAt: Date.now(),
    };

    setReportedEvents((prev) => {
      const filtered = prev.filter((e) => e.id !== updatedEvent.id);
      return [updatedEvent, ...filtered];
    });

    setEditingEvent(null);

    if (user.uid === DUMMY_USER_ID) return;

    // DB書き込みはバックグラウンドで（UIはブロックしない）
    const eventDoc = doc(db, "users", user.uid, "events", eventToUpdate.id);
    updateDoc(eventDoc, {
      reportStatus: status,
      reportMemo: targetMemo,
      isReported: true,
      updatedAt: Date.now(),
    }).catch((err) => {
      console.error("ReportPage: save-error", err);
      toast({ variant: "destructive", title: "保存に失敗しました", description: err.message });
    });

    // Google Calendar の説明欄にタグを書き戻し（失敗時のみトースト）
    patchReportDescription(
      eventToUpdate.googleEventId || eventToUpdate.id,
      status,
      eventToUpdate.description
    ).then((result) => {
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Googleカレンダーに反映できませんでした",
          description: result.message ?? "",
        });
      }
    });
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
        <ClipboardCheck className="h-12 w-12 mx-auto opacity-20" />
        <p className="text-sm font-bold">ログインが必要です</p>
        <Button asChild className="rounded-full px-8 gap-2 font-bold">
          <Link href="/login"><LogIn className="h-4 w-4" /> ログイン画面へ</Link>
        </Button>
      </div>
    );
  }

  const currentEvent = events[0];
  const nextEvent = events[1];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <QuotePopup />
      
      <header className="p-8 pt-16 flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary/40">
            <ClipboardCheck className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">日報</span>
          </div>
          <h1 className="text-2xl font-headline font-bold text-foreground/70">報告</h1>
        </div>
      </header>

      <main className="flex-1 px-8 flex flex-col items-center pt-4">
        {loading && events.length === 0 ? (
          <div className="flex py-32 justify-center w-full">
            <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
          </div>
        ) : currentEvent ? (
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em]">
              残り: {events.length}件
            </div>

            <div className="w-full relative">
              {/* 次カードのプレビュー層 */}
              {nextEvent && (
                <div className="absolute inset-0 scale-95 opacity-40 pointer-events-none z-0">
                  <Card className="w-full h-full border-none shadow-lg bg-paper-warm rounded-[2.5rem] overflow-hidden">
                    <CardContent className="p-10 space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-primary/40 truncate">
                          <div className="w-2 h-2 rounded-full bg-primary/20" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">
                            {nextEvent.calendarName}
                          </span>
                        </div>
                        <h2 className="text-2xl font-headline leading-tight text-foreground/80 line-clamp-3">
                          {nextEvent.title}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60">
                          <Clock className="h-4 w-4 shrink-0" />
                          {format(parseISO(nextEvent.startAt), "M月d日(E) HH:mm", { locale: ja })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <AnimatePresence initial={false} mode="wait">
                <ReportSwipeCard
                  key={currentEvent.id}
                  event={currentEvent}
                  exitDir={exitDir}
                  memo={memo}
                  onMemoChange={setMemo}
                  onReport={(status, exit) => handleReport(status, currentEvent, undefined, exit)}
                />
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-12">
            <div className="text-center space-y-4 pt-6">
              <div className="w-20 h-20 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-primary/10 mb-2">
                <CheckCircle2 className="text-primary/40 h-10 w-10" />
              </div>
              <p className="text-lg font-headline font-bold text-foreground/70">報告すべき予定はありません</p>
            </div>

            {reportedEvents.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary/30 px-2">
                  <History className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">最近の報告履歴</span>
                </div>
                <div className="space-y-4">
                  {reportedEvents.map((ev) => (
                    <Card key={ev.id} onClick={() => setEditingEvent(ev)} className="border-none shadow-sm bg-paper rounded-3xl cursor-pointer hover:bg-paper-warm transition-all">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          ev.reportStatus === 'done' ? 'bg-emerald-50 text-emerald-500' :
                          ev.reportStatus === 'failed' ? 'bg-rose-50 text-rose-500' :
                          ev.reportStatus === 'deferred' ? 'bg-amber-50 text-amber-500' :
                          'bg-paper-warm text-ink-faint'
                        }`}>
                          {ev.reportStatus === 'done' ? <CheckCircle2 className="h-5 w-5" /> :
                           ev.reportStatus === 'failed' ? <XCircle className="h-5 w-5" /> :
                           ev.reportStatus === 'deferred' ? <PauseCircle className="h-5 w-5" /> :
                           <MinusCircle className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-bold text-foreground/70 truncate">{ev.title}</h4>
                          <p className="text-[10px] text-muted-foreground opacity-50">{format(parseISO(ev.startAt), "M/d HH:mm")}</p>
                        </div>
                        <Edit3 className="h-4 w-4 text-primary/20" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-[420px] rounded-[2.5rem] p-8 border-none">
          {editingEvent && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-primary/40">{editingEvent.calendarName}</span>
                <DialogTitle className="text-xl font-headline font-bold text-foreground/70">{editingEvent.title}</DialogTitle>
                <DialogDescription className="sr-only">報告内容を編集します</DialogDescription>
              </div>
              <Textarea
                placeholder="メモを編集..."
                defaultValue={editingEvent.reportMemo}
                id="edit-memo-dialog"
                className="bg-primary/[0.01] border-none rounded-2xl min-h-[120px] resize-none"
              />
              <div className="grid grid-cols-3 gap-3">
                <Button onClick={() => handleReport("done", editingEvent, (document.getElementById('edit-memo-dialog') as HTMLTextAreaElement)?.value)} className="bg-emerald-50 text-emerald-600 rounded-2xl h-14 hover:bg-emerald-100 border-none text-[11px] font-bold">できた</Button>
                <Button onClick={() => handleReport("deferred", editingEvent, (document.getElementById('edit-memo-dialog') as HTMLTextAreaElement)?.value)} className="bg-amber-50 text-amber-600 rounded-2xl h-14 hover:bg-amber-100 border-none text-[11px] font-bold">保留</Button>
                <Button onClick={() => handleReport("failed", editingEvent, (document.getElementById('edit-memo-dialog') as HTMLTextAreaElement)?.value)} className="bg-rose-50 text-rose-600 rounded-2xl h-14 hover:bg-rose-100 border-none text-[11px] font-bold">未達</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
}
