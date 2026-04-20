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

function getCachedToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CALENDAR_TOKEN_KEY);
}

async function patchGoogleEvent(
  googleEventId: string,
  patch: Record<string, unknown>,
  calendarId: string = "primary"
): Promise<void> {
  const token = getCachedToken();
  if (!token) {
    console.warn("calendar-writeback: no access token, skipping", { googleEventId });
    return;
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
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn("calendar-writeback: patch failed", {
        status: res.status,
        error: body?.error?.message,
        googleEventId,
      });
      if (res.status === 401) {
        // 期限切れトークンは破棄（次回同期時にユーザーが再取得）
        sessionStorage.removeItem(CALENDAR_TOKEN_KEY);
      }
    }
  } catch (e) {
    console.warn("calendar-writeback: patch error", e);
  }
}

export async function patchQuadrantColor(
  googleEventId: string,
  category: QuadrantCategory
): Promise<void> {
  const colorId = QUADRANT_COLOR_ID[category];
  if (!colorId || !googleEventId) return;
  await patchGoogleEvent(googleEventId, { colorId });
}

export async function patchReportDescription(
  googleEventId: string,
  status: ReportStatus,
  existingDescription: string | undefined
): Promise<void> {
  if (!googleEventId) return;
  const label = REPORT_LABEL[status];
  if (!label) return;

  const today = new Date().toISOString().slice(0, 10);
  const tag = `[DAYS] ${label} (${today})`;

  const base = (existingDescription || "").replace(DAYS_TAG_REGEX, "").trimEnd();
  const newDescription = base ? `${base}\n\n${tag}` : tag;

  await patchGoogleEvent(googleEventId, { description: newDescription });
}
