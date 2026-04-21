/**
 * Google Calendar への書き戻しヘルパー。
 * 分類 → イベント色 / 報告 → 説明欄タグ。
 * 失敗は静かに Console へのみ出力（ユーザーにトーストは出さない）。
 */

import { QuadrantCategory, ReportStatus } from "@/lib/types";

// sessionStorage キー。settings の同期キャッシュと共有。
// 書き込みスコープ追加に合わせて :v2 でバンプし、古いトークンは破棄させる。
export const CALENDAR_TOKEN_KEY = "days:calendarAccessToken:v2";

// Google Calendar のカラーID: https://developers.google.com/calendar/api/v3/reference/colors
const QUADRANT_COLOR_ID: Record<QuadrantCategory, string> = {
  urgent_important: "11", // Tomato (赤)
  not_urgent_important: "10", // Basil (緑)
  urgent_not_important: "5", // Banana (黄)
  not_urgent_not_important: "8", // Graphite (グレー)
};

const REPORT_LABEL: Record<ReportStatus, string> = {
  done: "✅ できた",
  failed: "❌ 未達",
  cancelled: "⛔ 中止",
  deferred: "⏸ 保留",
};

// 既存の [DAYS] タグを末尾から剥がすための正規表現
const DAYS_TAG_REGEX = /\n*\[DAYS\][\s\S]*$/;

export type WritebackResult =
  | { ok: true }
  | { ok: false; reason: "NO_TOKEN" | "AUTH_EXPIRED" | "FORBIDDEN" | "NOT_FOUND" | "RATE_LIMITED" | "OTHER"; message?: string };

function getCachedToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CALENDAR_TOKEN_KEY);
}

async function patchGoogleEvent(
  googleEventId: string,
  patch: Record<string, unknown>,
  calendarId: string = "primary"
): Promise<WritebackResult> {
  const token = getCachedToken();
  if (!token) {
    return { ok: false, reason: "NO_TOKEN", message: "アクセストークンが未取得です。設定画面で同期してください。" };
  }
  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(googleEventId)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message;
    console.warn("calendar-writeback: patch failed", { status: res.status, message });

    if (res.status === 401) {
      sessionStorage.removeItem(CALENDAR_TOKEN_KEY);
      return { ok: false, reason: "AUTH_EXPIRED", message: "認証が切れました。設定画面で再同期してください。" };
    }
    if (res.status === 403) {
      return {
        ok: false,
        reason: "FORBIDDEN",
        message: "書き込み権限がありません。設定 → カレンダー同期で権限を付与してください（招待された予定は変更不可）。",
      };
    }
    if (res.status === 404) {
      return { ok: false, reason: "NOT_FOUND", message: "Google Calendar 上にこの予定が見つかりません。" };
    }
    if (res.status === 429) {
      return { ok: false, reason: "RATE_LIMITED", message: "一時的にリクエスト過多です。少し待って再試行してください。" };
    }
    return { ok: false, reason: "OTHER", message: message || `エラー(${res.status})` };
  } catch (e: any) {
    console.warn("calendar-writeback: patch error", e);
    return { ok: false, reason: "OTHER", message: e?.message || "ネットワークエラー" };
  }
}

export async function patchQuadrantColor(
  googleEventId: string,
  category: QuadrantCategory
): Promise<WritebackResult> {
  const colorId = QUADRANT_COLOR_ID[category];
  if (!colorId || !googleEventId) {
    return { ok: false, reason: "NOT_FOUND", message: "イベントIDまたはカラーが不正です。" };
  }
  return patchGoogleEvent(googleEventId, { colorId });
}

export async function patchReportDescription(
  googleEventId: string,
  status: ReportStatus,
  existingDescription: string | undefined
): Promise<WritebackResult> {
  if (!googleEventId) return { ok: false, reason: "NOT_FOUND" };
  const label = REPORT_LABEL[status];
  if (!label) return { ok: false, reason: "NOT_FOUND" };

  const today = new Date().toISOString().slice(0, 10);
  const tag = `[DAYS] ${label} (${today})`;

  const base = (existingDescription || "").replace(DAYS_TAG_REGEX, "").trimEnd();
  const newDescription = base ? `${base}\n\n${tag}` : tag;

  return patchGoogleEvent(googleEventId, { description: newDescription });
}
