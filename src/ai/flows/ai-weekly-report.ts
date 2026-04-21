'use server';
/**
 * Review 画面用の AI 観察（Anthropic Claude）
 * 事実のみ述べる。評価・提案・褒めはしない。
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface DailyStat {
  date: string; // YYYY-MM-DD
  ratio: number | null; // 0-100, null=記録なし
  total: number;
}

export interface ReviewObservationInput {
  periodLabel: string;
  totalEvents: number;
  doneCount: number;
  recordedDays: number;
  totalDays: number;
  dailyStats: DailyStat[];
}

export interface ReviewObservationOutput {
  observation: string;
}

export type AiWeeklyReportResult =
  | { ok: true; data: ReviewObservationOutput }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `あなたは事実を観察するレポーターです。
期間内のデータから、目に見えた傾向を1〜2点だけ取り上げて、事実のみを簡潔に述べてください。

【絶対ルール】
- 評価・提案・アドバイス・励ましは一切しない
- 「頑張りましたね」「素晴らしい」「〜できましたね」など肯定評価も禁止
- 「もっと〜すべき」「〜が足りない」などの否定評価も禁止
- 逆接（しかし・でも・一方で）は使わない
- 客観的な観察だけを述べる：「〜が見えます」「〜が目立ちます」「〜の日は色が深いです」など
- 日本語で1〜2文、200字以内

【出力形式】
以下のJSONのみで回答してください。余計な説明は一切不要です。
{
  "observation": "観察文"
}`;

function buildUserPrompt(input: ReviewObservationInput): string {
  const statsSummary = input.dailyStats
    .map((d) => {
      if (d.ratio === null) return `${d.date}: 記録なし`;
      return `${d.date}: ○率${d.ratio}%（${d.total}件）`;
    })
    .join('\n');

  const overallRatio =
    input.totalEvents > 0 ? Math.round((input.doneCount / input.totalEvents) * 100) : 0;

  return `${input.periodLabel}のデータです。

【全体】
- 総予定数: ${input.totalEvents}件
- 完了数: ${input.doneCount}件
- 全体○率: ${overallRatio}%
- 記録日数: ${input.recordedDays} / ${input.totalDays}日

【日別の○率】
${statsSummary}

この期間の記録から、事実だけを1〜2文で観察してください。`;
}

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return match[0];
}

export async function aiWeeklyReport(
  input: ReviewObservationInput
): Promise<AiWeeklyReportResult> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { ok: false, error: 'ANTHROPIC_API_KEY is not set on the server.' };
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Empty response from Claude');
    }
    const parsed = JSON.parse(extractJson(textBlock.text));
    if (typeof parsed.observation !== 'string') {
      throw new Error('observation is missing in response');
    }
    return { ok: true, data: { observation: parsed.observation } };
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error('aiWeeklyReport failed:', message);
    return { ok: false, error: message };
  }
}
