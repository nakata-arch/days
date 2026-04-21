'use server';
/**
 * @fileOverview 週報レポート生成の Genkit Flow。
 * 事実ベースで、B象限（重要×非緊急）への取り組みを中心にレビュー。
 * 評価や押し付けはせず、前向きに締める。
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RoleSchema = z.object({
  name: z.string(),
  goal: z.string(),
});

const WeeklyReportInputSchema = z.object({
  mission: z.object({
    roles: z.array(RoleSchema),
    weeklyFocus: z.string(),
  }),
  periodLabel: z.string().describe('対象期間。例: "今週", "今月", "2026-04-21〜04-27"'),
  nextPeriodLabel: z.string().describe('次期間の表示名。例: "来週", "来月", "これから"'),
  totalEvents: z.number(),
  doneCount: z.number(),
  failedCount: z.number(),
  deferredCount: z.number(),
  unreportedCount: z.number().describe('期間内で過去なのに未報告のまま残っている件数'),
  quadrantCounts: z.object({
    a: z.number().describe('重要×緊急'),
    b: z.number().describe('重要×非緊急'),
    c: z.number().describe('緊急×非重要'),
    d: z.number().describe('低優先'),
  }),
  bDoneCount: z.number().describe('B象限のうち「できた」数'),
  bTotalCount: z.number().describe('B象限の総数'),
  importantFocusPct: z.number().describe('B象限の処理度 0-100（bDone/bTotal）'),
  userComment: z.string(),
});
export type WeeklyReportInput = z.infer<typeof WeeklyReportInputSchema>;

const WeeklyReportOutputSchema = z.object({
  summary: z.string().describe('期間の活動の客観的な要約（1〜2文）'),
  importantFocus: z.string().describe('B象限（重要×非緊急）の取り組み評価。具体数値を含む（2〜3文）'),
  missionAlignment: z.string().describe('ミッション（役割・目標）との接点（1〜2文）'),
  nextWeek: z.string().describe('次期間への前向きな一言（「{nextPeriodLabel}も応援しています！」で締める、1文）'),
});
export type WeeklyReportOutput = z.infer<typeof WeeklyReportOutputSchema>;

export type AiWeeklyReportResult =
  | { ok: true; data: WeeklyReportOutput }
  | { ok: false; error: string };

/**
 * サーバーアクション経由で呼び出される関数。
 * エラーを throw せずに { ok: false, error } として返すことで、
 * Next.js 本番ビルドのエラーマスキングを回避し、クライアントに詳細を届ける。
 */
export async function aiWeeklyReport(
  input: WeeklyReportInput
): Promise<AiWeeklyReportResult> {
  try {
    const data = await aiWeeklyReportFlow(input);
    return { ok: true, data };
  } catch (err: any) {
    const message = err?.message || String(err) || "unknown error";
    console.error("aiWeeklyReport failed:", message, err?.stack);
    return { ok: false, error: message };
  }
}

const weeklyReportPrompt = ai.definePrompt({
  name: 'aiWeeklyReportPrompt',
  input: { schema: WeeklyReportInputSchema },
  output: { schema: WeeklyReportOutputSchema },
  prompt: `あなたは「振り返りコーチ」です。
1つの期間の行動データをもとに、事実に基づいた週報レポートを作成してください。

【重視するポイント】
1. B象限（重要×非緊急）への取り組み — 長期的な成果につながる時間の使い方
2. ミッションで登録された役割・目標との接点
3. 完了状況から読み取れる行動パターン

【絶対ルール】
- ネガティブな評価・指摘・アドバイスはしない
- 「〜できませんでした」「〜が足りない」「もっと〜すべき」などは使わない
- 「しかし」「でも」「一方で」などの逆接は避ける
- 事実（数字・事象）を率直に伝える。良し悪しの判定はしない
- 最後は前向きに締め、必ず「{{{nextPeriodLabel}}}も応援しています！」で終わらせる

【トーン】
- 敬語で、温かく、押し付けがましくない
- コーチより「伴走する仲間」の距離感
- 「〜ですね」「〜できましたね」「〜が見えます」など

【レポート構成】
1. summary（1〜2文）: {{{periodLabel}}}の活動の概要を、数字を交えて客観的に
2. importantFocus（2〜3文）: B象限の取り組み。具体数値（件数・処理度%）を入れ、どんな時間として使えたかを事実ベースで言及
3. missionAlignment（1〜2文）: 登録された役割・目標と{{{periodLabel}}}の行動の接点
4. nextWeek（1文）: 励ましで締める。末尾は「{{{nextPeriodLabel}}}も応援しています！」

【ユーザーデータ】
ミッション：
{{#each mission.roles}}
- {{name}}（目標: {{goal}}）
{{else}}
- （未登録）
{{/each}}
今週のフォーカス: {{#if mission.weeklyFocus}}{{{mission.weeklyFocus}}}{{else}}（未記入）{{/if}}

{{{periodLabel}}}の集計：
- 予定数: {{{totalEvents}}}件
- 完了: {{{doneCount}}}件 / 未達: {{{failedCount}}}件 / 保留: {{{deferredCount}}}件 / 未報告: {{{unreportedCount}}}件
- 象限分布（件数）: A={{{quadrantCounts.a}}}（重要×緊急） / B={{{quadrantCounts.b}}}（重要×非緊急） / C={{{quadrantCounts.c}}}（緊急×非重要） / D={{{quadrantCounts.d}}}（低優先）
- B象限の処理度: {{{bDoneCount}}} / {{{bTotalCount}}} 件 = {{{importantFocusPct}}}%

ユーザーコメント:
{{#if userComment}}
{{{userComment}}}
{{else}}
（なし）
{{/if}}

出力は JSON 形式で、"summary", "importantFocus", "missionAlignment", "nextWeek" を含めてください。`,
});

const aiWeeklyReportFlow = ai.defineFlow(
  {
    name: 'aiWeeklyReportFlow',
    inputSchema: WeeklyReportInputSchema,
    outputSchema: WeeklyReportOutputSchema,
  },
  async (input) => {
    const { output } = await weeklyReportPrompt(input);
    if (!output) throw new Error('Failed to generate weekly report.');
    return output;
  }
);
