'use server';
/**
 * @fileOverview 振り返りコーチによる「褒める・励ます」専用AIフィードバック。
 *
 * 絶対ルール：
 * - ネガティブな評価・指摘・アドバイスは一切しない
 * - 逆接（しかし/でも/一方で）を使わない
 * - 必ず「できたこと」を起点にする
 * - 最後は {nextPeriodLabel}も応援しています！ で締める
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RoleSchema = z.object({
  name: z.string().describe('ユーザーの役割名'),
  goal: z.string().describe('その役割の長期目標'),
});

const PraiseFeedbackInputSchema = z.object({
  mission: z.object({
    roles: z.array(RoleSchema).describe('登録された役割と目標'),
    weeklyFocus: z.string().describe('今週のフォーカス'),
  }),
  periodLabel: z.string().describe('対象期間の表示名。例: "今週", "今月", "今年", "2024年1月1日〜1月15日"'),
  nextPeriodLabel: z.string().describe('次期間の表示名。例: "来週", "来月", "来年", "これから"'),
  quadrantPercents: z.object({
    a: z.number().describe('A: 重要×緊急 の比率（%）'),
    b: z.number().describe('B: 重要×非緊急 の比率（%）'),
    c: z.number().describe('C: 緊急×非重要 の比率（%）'),
    d: z.number().describe('D: 低優先 の比率（%）'),
  }),
  doneCount: z.number().describe('完了した予定数'),
  notDoneCount: z.number().describe('未完了の予定数'),
  userComment: z.string().describe('ユーザーの日記メモを期間分連結したもの'),
});
export type PraiseFeedbackInput = z.infer<typeof PraiseFeedbackInputSchema>;

const PraiseFeedbackOutputSchema = z.object({
  highlight: z.string().describe('今期のハイライト（1〜2文・できたことを具体的に）'),
  missionLink: z.string().describe('ミッションとの接点（1文・役割や目標と行動を結びつけて褒める）'),
  encouragement: z.string().describe('次期へ向けた一言（「{nextPeriodLabel}も応援しています！」で終わる）'),
});
export type PraiseFeedbackOutput = z.infer<typeof PraiseFeedbackOutputSchema>;

export async function aiWeeklyPraiseFeedback(input: PraiseFeedbackInput): Promise<PraiseFeedbackOutput> {
  return aiWeeklyPraiseFeedbackFlow(input);
}

const praisePrompt = ai.definePrompt({
  name: 'aiWeeklyPraiseFeedbackPrompt',
  input: { schema: PraiseFeedbackInputSchema },
  output: { schema: PraiseFeedbackOutputSchema },
  prompt: `あなたは「振り返りコーチ」です。
ユーザーの行動データをもとに、必ずポジティブなフィードバックだけを返してください。

【絶対ルール】
- ネガティブな評価・指摘・アドバイスは一切しない
- 「〜できませんでした」「〜が足りない」「もっと〜すべき」などの表現は使わない
- 「しかし」「でも」「一方で」などの逆接は使わない
- 常に「できたこと」「頑張ったこと」「気づいたこと」を起点にする
- ユーザーを責めず、現実をそのまま肯定する
- 最後は必ず「{{{nextPeriodLabel}}}も応援しています！」で締める

【褒める起点の探し方】
- 完了0件でも「記録した」「振り返った」こと自体を褒める
- B（重要×非緊急）が少なくてもAをこなした頑張りを褒める
- コメントが短くても「正直に書いてくれた」ことを褒める
- どんなデータでも必ず「良かった点」を見つけて伝える

【トーン】
- 温かく、親しみやすく（敬語だが堅すぎない）
- コーチではなく「応援してくれる仲間」のような口調

【フィードバックの構成】
1. highlight（1〜2文）: {{{periodLabel}}}の分類・実行データから「できたこと」を具体的に拾う
2. missionLink（1文）: 登録された役割・目標と{{{periodLabel}}}の行動を結びつけて褒める
3. encouragement（1文）: 励ましの言葉で締める。**必ず**「{{{nextPeriodLabel}}}も応援しています！」で終わる

【ユーザーデータ】
ミッション：
{{#if mission.roles.length}}
{{#each mission.roles}}
- {{name}}（目標: {{goal}}）
{{/each}}
{{else}}
（未登録）
{{/if}}
今週のフォーカス: {{#if mission.weeklyFocus}}{{{mission.weeklyFocus}}}{{else}}（未記入）{{/if}}

{{{periodLabel}}}のA/B/C/D比率：A={{{quadrantPercents.a}}}% B={{{quadrantPercents.b}}}% C={{{quadrantPercents.c}}}% D={{{quadrantPercents.d}}}%
完了した予定数：{{{doneCount}}}件
未完了の予定数：{{{notDoneCount}}}件
ユーザーコメント：{{#if userComment}}{{{userComment}}}{{else}}（なし）{{/if}}

出力はJSON形式で、"highlight"、"missionLink"、"encouragement" を含めてください。`,
});

const aiWeeklyPraiseFeedbackFlow = ai.defineFlow(
  {
    name: 'aiWeeklyPraiseFeedbackFlow',
    inputSchema: PraiseFeedbackInputSchema,
    outputSchema: PraiseFeedbackOutputSchema,
  },
  async (input) => {
    const { output } = await praisePrompt(input);
    if (!output) {
      throw new Error('Failed to generate praise feedback.');
    }
    return output;
  }
);
