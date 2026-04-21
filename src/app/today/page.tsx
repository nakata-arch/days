"use client";

import { useMemo } from "react";
import Link from "next/link";
import { collection, query, orderBy } from "firebase/firestore";
import {
  format,
  parseISO,
  isBefore,
  startOfToday,
  endOfDay,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { ja } from "date-fns/locale";

import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { AppEvent } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { Loader2, ClipboardCheck, ListTodo, Clock, LogIn, ArrowRight } from "lucide-react";

export default function TodayPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users", user.uid, "events"), orderBy("startAt", "asc"));
  }, [user, db]);
  const { data: allEvents, isLoading } = useCollection<AppEvent>(eventsQuery);

  const { reportCount, classifyCount, todayEvents } = useMemo(() => {
    if (!allEvents) return { reportCount: 0, classifyCount: 0, todayEvents: [] as AppEvent[] };
    const now = new Date();
    const today = startOfToday();
    const endOfToday = endOfDay(today);

    const filtered = allEvents.filter((e) => !e.deleted);

    const report = filtered.filter((e) => {
      if (e.reportStatus) return false;
      try {
        return isBefore(parseISO(e.startAt), now);
      } catch {
        return false;
      }
    }).length;

    const classify = filtered.filter((e) => {
      if (e.quadrantCategory) return false;
      try {
        return !isBefore(parseISO(e.startAt), today);
      } catch {
        return false;
      }
    }).length;

    const todays = filtered
      .filter((e) => {
        try {
          const d = parseISO(e.startAt);
          return isWithinInterval(d, { start: startOfDay(today), end: endOfToday });
        } catch {
          return false;
        }
      })
      .sort((a, b) => (a.startAt < b.startAt ? -1 : 1));

    return { reportCount: report, classifyCount: classify, todayEvents: todays };
  }, [allEvents]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-paper gap-4">
        <Loader2 className="animate-spin opacity-40 h-6 w-6 text-ink-faint" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-paper p-8 text-center gap-6">
        <p className="text-sm text-ink">ログインが必要です</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 font-sans text-xs tracking-[0.15em] hover:opacity-90"
        >
          <LogIn className="h-4 w-4" /> ログイン画面へ
        </Link>
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="flex flex-col min-h-screen bg-paper pb-32">
      <header className="px-6 pt-10 pb-6 border-b border-rule flex justify-between items-center max-w-[720px] mx-auto w-full">
        <div className="font-latin text-[18px] font-medium tracking-[0.35em]">DAYS</div>
        <div className="font-sans text-[11px] tracking-[0.15em] text-ink-faint">
          {format(today, "yyyy.MM.dd").toUpperCase()} ·{" "}
          {format(today, "E", { locale: ja }).toUpperCase()}
        </div>
      </header>

      <main className="max-w-[720px] w-full mx-auto px-6 pt-10 space-y-12">
        <div>
          <div className="font-latin italic text-[13px] text-[hsl(var(--accent))] tracking-[0.2em] mb-3">
            Today
          </div>
          <h1 className="text-3xl font-headline font-semibold text-ink mb-2">今日</h1>
          <p className="text-[14px] text-ink-soft leading-relaxed">
            終わった予定を振り返り、これからの予定を整える。
          </p>
        </div>

        {/* 報告 */}
        <section className="border border-rule bg-paper">
          <div className="flex items-center justify-between p-5 border-b border-rule">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-4 w-4 text-ink-faint" />
              <div>
                <div className="font-latin italic text-[12px] text-[hsl(var(--accent))] tracking-[0.15em]">
                  I · Report
                </div>
                <h2 className="text-base font-headline font-semibold text-ink">報告</h2>
              </div>
            </div>
            <span className="font-latin text-[28px] font-medium text-ink leading-none">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-ink-faint" /> : reportCount}
            </span>
          </div>
          <div className="p-5">
            {reportCount > 0 ? (
              <>
                <p className="text-[13px] text-ink-soft leading-relaxed mb-4">
                  過去の予定で報告されていないものが {reportCount} 件あります。
                </p>
                <Link
                  href="/report"
                  className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-3 font-sans text-xs tracking-[0.15em] hover:opacity-90"
                >
                  報告する <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <p className="text-[13px] text-ink-faint italic">未報告の予定はありません。</p>
            )}
          </div>
        </section>

        {/* 分類 */}
        <section className="border border-rule bg-paper">
          <div className="flex items-center justify-between p-5 border-b border-rule">
            <div className="flex items-center gap-3">
              <ListTodo className="h-4 w-4 text-ink-faint" />
              <div>
                <div className="font-latin italic text-[12px] text-[hsl(var(--accent))] tracking-[0.15em]">
                  II · Classify
                </div>
                <h2 className="text-base font-headline font-semibold text-ink">分類</h2>
              </div>
            </div>
            <span className="font-latin text-[28px] font-medium text-ink leading-none">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-ink-faint" /> : classifyCount}
            </span>
          </div>
          <div className="p-5">
            {classifyCount > 0 ? (
              <>
                <p className="text-[13px] text-ink-soft leading-relaxed mb-4">
                  今日以降の予定で未分類のものが {classifyCount} 件あります。
                </p>
                <Link
                  href="/classify"
                  className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-3 font-sans text-xs tracking-[0.15em] hover:opacity-90"
                >
                  分類する <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <p className="text-[13px] text-ink-faint italic">分類待ちの予定はありません。</p>
            )}
          </div>
        </section>

        {/* 今日の予定一覧 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-4 w-4 text-ink-faint" />
            <div>
              <div className="font-latin italic text-[12px] text-[hsl(var(--accent))] tracking-[0.15em]">
                III · Today
              </div>
              <h2 className="text-base font-headline font-semibold text-ink">今日の予定</h2>
            </div>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-[13px] text-ink-faint italic py-6 text-center border border-dashed border-rule">
              今日の予定はありません。
            </p>
          ) : (
            <ul className="border border-rule bg-paper divide-y divide-rule">
              {todayEvents.map((ev) => (
                <li key={ev.id} className="p-4 flex items-center gap-4">
                  <span className="font-latin italic text-[13px] text-ink-faint min-w-[52px]">
                    {format(parseISO(ev.startAt), "HH:mm")}
                  </span>
                  <span className="flex-1 text-[14px] text-ink truncate">{ev.title}</span>
                  {ev.reportStatus === "done" && (
                    <span className="text-xs text-emerald-700">○</span>
                  )}
                  {ev.reportStatus === "failed" && (
                    <span className="text-xs text-[hsl(var(--accent))]">×</span>
                  )}
                  {ev.reportStatus === "deferred" && (
                    <span className="text-xs text-amber-700">保留</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <Navigation />
    </div>
  );
}
