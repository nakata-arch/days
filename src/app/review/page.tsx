"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  subMonths,
  subYears,
  addMonths,
  addYears,
  subWeeks,
  addWeeks,
  eachDayOfInterval,
  isWithinInterval,
  getDay,
  isAfter,
} from "date-fns";
import { ja } from "date-fns/locale";

import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { AppEvent } from "@/lib/types";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { aiWeeklyReport } from "@/ai/flows/ai-weekly-report";
import { LogIn, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import "./review.css";

type PeriodType = "week" | "month" | "quarter" | "year";

interface DayStat {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  total: number;
  done: number;
  ratio: number | null; // 0-100, null = no record
  level: 0 | 1 | 2 | 3 | 4;
}

function ratioToLevel(total: number, ratio: number | null): 0 | 1 | 2 | 3 | 4 {
  if (total === 0 || ratio === null) return 0;
  if (ratio <= 25) return 1;
  if (ratio <= 50) return 2;
  if (ratio <= 75) return 3;
  return 4;
}

function getPeriodRange(type: PeriodType, ref: Date): { start: Date; end: Date } {
  switch (type) {
    case "week":
      return {
        start: startOfWeek(ref, { weekStartsOn: 1 }),
        end: endOfWeek(ref, { weekStartsOn: 1 }),
      };
    case "month":
      return { start: startOfMonth(ref), end: endOfMonth(ref) };
    case "quarter": {
      // 3ヶ月（当月を含む過去3ヶ月）
      const end = endOfMonth(ref);
      const start = startOfMonth(subMonths(ref, 2));
      return { start, end };
    }
    case "year":
      return { start: startOfYear(ref), end: endOfYear(ref) };
  }
}

function formatPeriodLabel(type: PeriodType, range: { start: Date; end: Date }): string {
  switch (type) {
    case "week":
      return `${format(range.start, "M月d日", { locale: ja })} 〜 ${format(range.end, "M月d日", { locale: ja })}`;
    case "month":
      return format(range.start, "yyyy年 M月", { locale: ja });
    case "quarter":
      return `${format(range.start, "yyyy年 M月", { locale: ja })} 〜 ${format(range.end, "M月", { locale: ja })}`;
    case "year":
      return format(range.start, "yyyy年", { locale: ja });
  }
}

export default function ReviewPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [periodType, setPeriodType] = useState<PeriodType>("week");
  const [refDate, setRefDate] = useState<Date>(() => new Date());
  const [observation, setObservation] = useState<string | null>(null);
  const [isLoadingObservation, setIsLoadingObservation] = useState(false);

  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "users", user.uid, "events"),
      orderBy("startAt", "desc")
    );
  }, [user, db]);
  const { data: allEvents, isLoading: isEventsLoading } = useCollection<AppEvent>(eventsQuery);

  const range = useMemo(() => getPeriodRange(periodType, refDate), [periodType, refDate]);
  const periodLabel = useMemo(() => formatPeriodLabel(periodType, range), [periodType, range]);

  // 期間内の予定を日単位で集計
  const dayStatMap = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    if (!allEvents) return map;
    for (const ev of allEvents) {
      if (ev.deleted) continue;
      try {
        const d = parseISO(ev.startAt);
        if (!isWithinInterval(d, range)) continue;
        const key = format(d, "yyyy-MM-dd");
        const cur = map.get(key) ?? { total: 0, done: 0 };
        cur.total += 1;
        if (ev.reportStatus === "done") cur.done += 1;
        map.set(key, cur);
      } catch {
        // ignore invalid dates
      }
    }
    return map;
  }, [allEvents, range]);

  // 期間内の各日の統計
  const daysInPeriod = useMemo(() => {
    const days = eachDayOfInterval(range);
    return days.map<DayStat>((d) => {
      const key = format(d, "yyyy-MM-dd");
      const entry = dayStatMap.get(key) ?? { total: 0, done: 0 };
      const ratio = entry.total > 0 ? Math.round((entry.done / entry.total) * 100) : null;
      return {
        date: d,
        dateStr: key,
        total: entry.total,
        done: entry.done,
        ratio,
        level: ratioToLevel(entry.total, ratio),
      };
    });
  }, [range, dayStatMap]);

  // 月別集計（四半期・年ビュー用）
  const monthStats = useMemo(() => {
    // 対象期間内を月単位に区切り、各月の done/total/ratio を求める
    const months: { date: Date; label: string; total: number; done: number; ratio: number | null; level: 0 | 1 | 2 | 3 | 4 }[] = [];
    if (daysInPeriod.length === 0) return months;
    let cursor = startOfMonth(range.start);
    while (cursor <= range.end) {
      const mEnd = endOfMonth(cursor);
      const mStart = startOfDay(cursor);
      const mEndDay = endOfDay(mEnd);
      let total = 0;
      let done = 0;
      for (const d of daysInPeriod) {
        if (d.date >= mStart && d.date <= mEndDay) {
          total += d.total;
          done += d.done;
        }
      }
      const ratio = total > 0 ? Math.round((done / total) * 100) : null;
      months.push({
        date: cursor,
        label: format(cursor, "MMM", { locale: ja }).replace("月", ""),
        total,
        done,
        ratio,
        level: ratioToLevel(total, ratio),
      });
      cursor = addMonths(cursor, 1);
    }
    return months;
  }, [daysInPeriod, range]);

  // 四半期の週単位ストライプ（月ごとに4分割）
  const quarterRows = useMemo(() => {
    return monthStats.map((m) => {
      const mStart = startOfMonth(m.date);
      const mEnd = endOfMonth(m.date);
      const allDays = eachDayOfInterval({ start: mStart, end: mEnd });
      // 月を4つのチャンクに分割
      const chunkSize = Math.ceil(allDays.length / 4);
      const weeks: { level: 0 | 1 | 2 | 3 | 4 }[] = [];
      for (let i = 0; i < 4; i++) {
        const chunk = allDays.slice(i * chunkSize, (i + 1) * chunkSize);
        let t = 0,
          d = 0;
        for (const day of chunk) {
          const entry = dayStatMap.get(format(day, "yyyy-MM-dd")) ?? { total: 0, done: 0 };
          t += entry.total;
          d += entry.done;
        }
        const r = t > 0 ? Math.round((d / t) * 100) : null;
        weeks.push({ level: ratioToLevel(t, r) });
      }
      return {
        label: format(m.date, "M月", { locale: ja }),
        weeks,
      };
    });
  }, [monthStats, dayStatMap]);

  // メトリクス
  const metrics = useMemo(() => {
    let totalEvents = 0;
    let doneCount = 0;
    let recordedDays = 0;
    for (const d of daysInPeriod) {
      totalEvents += d.total;
      doneCount += d.done;
      if (d.total > 0) recordedDays += 1;
    }
    const overallRatio = totalEvents > 0 ? Math.round((doneCount / totalEvents) * 100) : 0;
    return {
      overallRatio,
      recordedDays,
      totalDays: daysInPeriod.length,
      totalEvents,
      doneCount,
    };
  }, [daysInPeriod]);

  // 期間変更で observation をリセット
  useEffect(() => {
    setObservation(null);
  }, [periodType, refDate]);

  const canGoForward = useMemo(() => {
    const next = shiftRef(refDate, periodType, 1);
    return !isAfter(next, endOfDay(new Date()));
  }, [refDate, periodType]);

  function shiftRef(base: Date, type: PeriodType, dir: 1 | -1): Date {
    switch (type) {
      case "week":
        return dir === 1 ? addWeeks(base, 1) : subWeeks(base, 1);
      case "month":
        return dir === 1 ? addMonths(base, 1) : subMonths(base, 1);
      case "quarter":
        return dir === 1 ? addMonths(base, 3) : subMonths(base, 3);
      case "year":
        return dir === 1 ? addYears(base, 1) : subYears(base, 1);
    }
  }

  const handleGenerateObservation = async () => {
    if (!user) return;
    setIsLoadingObservation(true);
    try {
      const result = await aiWeeklyReport({
        periodLabel,
        totalEvents: metrics.totalEvents,
        doneCount: metrics.doneCount,
        recordedDays: metrics.recordedDays,
        totalDays: metrics.totalDays,
        dailyStats: daysInPeriod.map((d) => ({
          date: d.dateStr,
          ratio: d.ratio,
          total: d.total,
        })),
      });
      if (result.ok) {
        setObservation(result.data.observation);
      } else {
        toast({
          variant: "destructive",
          title: "AI観察を生成できませんでした",
          description: result.error,
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: e?.message || "通信に失敗しました。",
      });
    } finally {
      setIsLoadingObservation(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center gap-6">
        <p className="text-sm font-bold">ログインが必要です</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white"
        >
          <LogIn className="h-4 w-4" /> ログイン画面へ
        </Link>
      </div>
    );
  }

  return (
    <div className="rv-root">
      <header className="rv-header">
        <div className="rv-logo">DAYS</div>
        <div className="rv-date">{format(new Date(), "yyyy.MM.dd").toUpperCase()}</div>
      </header>

      <div className="rv-container">
        <div className="rv-title-block">
          <div className="rv-kicker">REVIEW</div>
          <h1>あなたの時間の積み上げ</h1>
          <p className="rv-subtitle">
            ○の割合を、深い色で示します。色が深いほど、あなたが決めたことを実行できた時間です。
          </p>
        </div>

        {/* PERIOD TABS */}
        <div className="rv-tabs">
          {(
            [
              { id: "week", jp: "1週間", en: "Week" },
              { id: "month", jp: "1ヶ月", en: "Month" },
              { id: "quarter", jp: "四半期", en: "Quarter" },
              { id: "year", jp: "1年", en: "Year" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setPeriodType(t.id);
                setRefDate(new Date());
              }}
              className={`rv-tab ${periodType === t.id ? "rv-active" : ""}`}
            >
              <span>{t.jp}</span>
              <span className="rv-tab-latin">{t.en}</span>
            </button>
          ))}
        </div>

        {/* PERIOD NAV */}
        <div className="rv-period-nav">
          <button
            type="button"
            className="rv-period-nav-btn"
            onClick={() => setRefDate(shiftRef(refDate, periodType, -1))}
          >
            <ChevronLeft className="inline h-4 w-4" /> 前へ
          </button>
          <div className="rv-period-range">{periodLabel}</div>
          <button
            type="button"
            className="rv-period-nav-btn"
            onClick={() => setRefDate(shiftRef(refDate, periodType, 1))}
            disabled={!canGoForward}
          >
            次へ <ChevronRight className="inline h-4 w-4" />
          </button>
        </div>

        {/* METRICS */}
        <div className="rv-metrics">
          <div className="rv-metric">
            <div className="rv-metric-label">○の割合</div>
            <div className="rv-metric-value">
              {metrics.overallRatio}
              <span className="rv-small">%</span>
            </div>
            <div className="rv-metric-unit">RATIO</div>
          </div>
          <div className="rv-metric">
            <div className="rv-metric-label">記録日数</div>
            <div className="rv-metric-value">
              {metrics.recordedDays}
              <span className="rv-small">/{metrics.totalDays}</span>
            </div>
            <div className="rv-metric-unit">DAYS</div>
          </div>
          <div className="rv-metric">
            <div className="rv-metric-label">総予定数</div>
            <div className="rv-metric-value">{metrics.totalEvents}</div>
            <div className="rv-metric-unit">EVENTS</div>
          </div>
        </div>

        {/* HEATMAP */}
        <div className="rv-section-label">
          <span className="rv-num">I.</span>HEATMAP
        </div>
        <div className="rv-heatmap-wrap">
          {isEventsLoading ? (
            <div className="rv-empty-state">読み込み中...</div>
          ) : metrics.totalEvents === 0 ? (
            <div className="rv-empty-state">この期間の記録はまだありません。</div>
          ) : (
            <>
              {periodType === "week" && <WeekView days={daysInPeriod} />}
              {periodType === "month" && <MonthView days={daysInPeriod} monthStart={range.start} />}
              {periodType === "quarter" && <QuarterView rows={quarterRows} />}
              {periodType === "year" && <YearView months={monthStats} />}
              <Legend />
            </>
          )}
        </div>

        {/* INSIGHT */}
        <div className="rv-section-label">
          <span className="rv-num">II.</span>INSIGHT
        </div>
        <div className="rv-insight">
          <div className="rv-insight-label">AIからの観察</div>
          {isLoadingObservation ? (
            <div>
              <div className="rv-skeleton" style={{ width: "100%" }} />
              <div className="rv-skeleton" style={{ width: "80%" }} />
            </div>
          ) : observation ? (
            <div className="rv-insight-body">{observation}</div>
          ) : (
            <div className="rv-insight-body" style={{ opacity: 0.7 }}>
              ボタンを押すと、この期間の記録から AI が事実を観察します。
            </div>
          )}
          {!isLoadingObservation && (
            <button
              type="button"
              className="rv-insight-button"
              onClick={handleGenerateObservation}
              disabled={metrics.totalEvents === 0}
            >
              {observation ? "もう一度観察する" : "AIに観察してもらう"}
            </button>
          )}
          <div className="rv-insight-note">※ AIは事実のみを示します。評価や提案はしません。</div>
        </div>

        {/* DIALOGUE（対話・準備中） */}
        <div className="rv-section-label">
          <span className="rv-num">III.</span>DIALOGUE
        </div>
        <div
          style={{
            border: "1px solid hsl(var(--rule))",
            background: "hsl(var(--paper-warm))",
            padding: "28px 24px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              fontFamily: "'EB Garamond', serif",
              fontStyle: "italic",
              fontSize: "12px",
              color: "hsl(var(--accent))",
              letterSpacing: "0.2em",
              marginBottom: "12px",
            }}
          >
            Coming Soon
          </div>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "hsl(var(--ink))",
              marginBottom: "12px",
            }}
          >
            AIと対話する
          </h3>
          <p
            style={{
              fontSize: "14px",
              lineHeight: "2",
              color: "hsl(var(--ink-soft))",
            }}
          >
            記録が積み上がった方から、AIとの対話で価値観を言語化していただけるようにする予定です。
            蓄積されたデータから、あなた自身の「北極星」を浮かび上がらせます。
          </p>
          <p
            style={{
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px dotted hsl(var(--rule))",
              fontFamily: "'Noto Sans JP', sans-serif",
              fontSize: "11px",
              color: "hsl(var(--ink-faint))",
              letterSpacing: "0.1em",
            }}
          >
            ※ この機能は現在準備中です。
          </p>
        </div>
      </div>

      <Navigation />
    </div>
  );
}

// ===== サブコンポーネント =====

function WeekView({ days }: { days: DayStat[] }) {
  const dowLabels = ["月", "火", "水", "木", "金", "土", "日"];
  return (
    <div className="rv-week">
      {days.map((d, i) => (
        <div key={d.dateStr} className="rv-week-cell" data-level={d.level}>
          <div className="rv-week-dow">{dowLabels[i]}</div>
          <div className="rv-week-date">{format(d.date, "d")}</div>
          <div className="rv-week-ratio">{d.ratio !== null ? `${d.ratio}%` : "—"}</div>
        </div>
      ))}
    </div>
  );
}

function MonthView({ days, monthStart }: { days: DayStat[]; monthStart: Date }) {
  const dowLabels = ["月", "火", "水", "木", "金", "土", "日"];
  // 月初の曜日（月=1..日=0/7）に合わせて先頭パディング
  const dowOfFirst = getDay(monthStart); // Sunday=0
  // 月曜始まりに変換：Monday=0, ... Sunday=6
  const pad = (dowOfFirst + 6) % 7;
  return (
    <div className="rv-month">
      {dowLabels.map((l) => (
        <div key={l} className="rv-month-header">{l}</div>
      ))}
      {Array.from({ length: pad }).map((_, i) => (
        <div key={`empty-${i}`} className="rv-month-cell rv-empty" />
      ))}
      {days.map((d) => (
        <div key={d.dateStr} className="rv-month-cell" data-level={d.level}>
          {format(d.date, "d")}
        </div>
      ))}
    </div>
  );
}

function QuarterView({
  rows,
}: {
  rows: { label: string; weeks: { level: 0 | 1 | 2 | 3 | 4 }[] }[];
}) {
  return (
    <div className="rv-quarter">
      {rows.map((r) => (
        <div key={r.label} className="rv-quarter-row">
          <div className="rv-quarter-label">{r.label}</div>
          <div className="rv-quarter-weeks">
            {r.weeks.map((w, i) => (
              <div key={i} className="rv-quarter-cell" data-level={w.level} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function YearView({
  months,
}: {
  months: { label: string; ratio: number | null; level: 0 | 1 | 2 | 3 | 4; date: Date }[];
}) {
  return (
    <div className="rv-year">
      {months.map((m) => (
        <div key={m.date.toISOString()} className="rv-year-col">
          <div className="rv-year-bar-wrap">
            <div
              className="rv-year-bar"
              data-level={m.level}
              style={{ height: `${m.ratio ?? 0}%` }}
            />
          </div>
          <div className="rv-year-label">{format(m.date, "MMM", { locale: ja }).replace("月", "")}</div>
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="rv-legend">
      <span>少ない</span>
      <div className="rv-legend-scale">
        <div className="rv-legend-cell" data-level="0" />
        <div className="rv-legend-cell" data-level="1" />
        <div className="rv-legend-cell" data-level="2" />
        <div className="rv-legend-cell" data-level="3" />
        <div className="rv-legend-cell" data-level="4" />
      </div>
      <span>積み上がっている</span>
    </div>
  );
}
