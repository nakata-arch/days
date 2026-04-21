'use server';
/**
 * 週報レポート生成 (Anthropic Claude API)
 * 事実ベース・B象限フォーカス・押し付けないトーン
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface RoleInput {
  name: string;
  goal: string;
}

export interface WeeklyReportInput {
  mission: {
    roles: RoleInput[];
    weeklyFocus: string;
  };
  periodLabel: string;
  nextPeriodLabel: string;
  totalEvents: number;
  doneCount: number;
  failedCount: number;
  deferredCount: number;
  unreportedCount: number;
  quadrantCounts: { a: number; b: number; c: number; d: number };
  bDoneCount: number;
  bTotalCount: number;
  importantFocusPct: number;
  userComment: string;
}

export interface WeeklyReportOutput {
  summary: string;
  importantFocus: string;
  missionAlignment: string;
  nextWeek: string;
}

export type AiWeeklyReportResult =
  | { ok: true; data: WeeklyReportOutput }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `あなたは「振り返りコーチ」です。
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
- 最後は前向きに締め、必ず末尾が「（次期間ラベル）も応援しています！」で終わるようにする

【トーン】
- 敬語で、温かく、押し付けがましくない
- コーチより「伴走する仲間」の距離感
- 「〜ですね」「〜できましたね」「〜が見えます」など

【出力形式】
以下のJSONのみで回答してください。余計な説明・前置きは不要です。
{
  "summary": "期間の活動の客観的な要約（1〜2文）",
  "importantFocus": "B象限の取り組み評価。具体数値（件数・%）を含む（2〜3文）",
  "missionAlignment": "ミッション（役割・目標）との接点（1〜2文）",
  "nextWeek": "次期間への前向きな一言（末尾は「（次期間ラベル）も応援しています！」で終わる、1文）"
}`;

function formatRoles(roles: RoleInput[]): string {
  if (!roles.length) return '（未登録）';
  return roles.map((r) => `- ${r.name}（目標: ${r.goal}）`).join('\n');
}

function buildUserPrompt(input: WeeklyReportInput): string {
  return `【ユーザーデータ】
ミッション：
${formatRoles(input.mission.roles)}

今週のフォーカス: ${input.mission.weeklyFocus || '（未記入）'}

${input.periodLabel}の集計：
- 予定数: ${input.totalEvents}件
- 完了: ${input.doneCount}件 / 未達: ${input.failedCount}件 / 保留: ${input.deferredCount}件 / 未報告: ${input.unreportedCount}件
- 象限分布（件数）: A=${input.quadrantCounts.a}（重要×緊急） / B=${input.quadrantCounts.b}（重要×非緊急） / C=${input.quadrantCounts.c}（緊急×非重要） / D=${input.quadrantCounts.d}（低優先）
- B象限の処理度: ${input.bDoneCount} / ${input.bTotalCount} 件 = ${input.importantFocusPct}%

ユーザーコメント:
${input.userComment || '（なし）'}

次期間ラベル: ${input.nextPeriodLabel}

nextWeek の末尾は必ず「${input.nextPeriodLabel}も応援しています！」で終わらせてください。
出力はJSONのみ。`;
}

function extractJson(text: string): string {
  // Claude が JSON 前後にテキストを付けた場合に備えて { ... } を抽出
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return match[0];
}

export async function aiWeeklyReport(
  input: WeeklyReportInput
): Promise<AiWeeklyReportResult> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { ok: false, error: 'ANTHROPIC_API_KEY is not set on the server.' };
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Empty response from Claude');
    }

    const parsed = JSON.parse(extractJson(textBlock.text));

    if (
      typeof parsed.summary !== 'string' ||
      typeof parsed.importantFocus !== 'string' ||
      typeof parsed.missionAlignment !== 'string' ||
      typeof parsed.nextWeek !== 'string'
    ) {
      throw new Error('Response JSON is missing required fields');
    }

    return {
      ok: true,
      data: {
        summary: parsed.summary,
        importantFocus: parsed.importantFocus,
        missionAlignment: parsed.missionAlignment,
        nextWeek: parsed.nextWeek,
      },
    };
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error('aiWeeklyReport failed:', message);
    return { ok: false, error: message };
  }
}
