'use server';
/**
 * 日記メモの AI 清書 (Anthropic Claude API)
 * テキスト入力のみ。音声は Web Speech API でクライアント側処理。
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface RefineReflectionInput {
  text: string;
}

export interface RefineReflectionOutput {
  refinedText: string;
}

const SYSTEM_PROMPT = `あなたは穏やかで思慮深い日記の代筆者、あるいはタイムマネジメント・コーチです。
ユーザーから提供された「断片的なメモ」を元に、その日の振り返り日記を優しく、読みやすく整えてください。

指針：
- ユーザーの口調や感情を尊重しつつ、支離滅裂な部分は整理してください。
- 1人称（私）の視点で、温かみのある文体にしてください。
- 長すぎず、150文字〜300文字程度にまとめてください。
- 決して批判せず、その日の努力や気づきを肯定的に捉えてください。
- 元の内容にない事実を捏造しないでください。

出力は以下のJSONのみで回答してください。余計な説明は不要です。
{
  "refinedText": "整形後の文章"
}`;

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return match[0];
}

export async function refineReflection(
  input: RefineReflectionInput
): Promise<RefineReflectionOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set on the server.');
  }
  if (!input.text || !input.text.trim()) {
    throw new Error('Input text is empty.');
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `以下のメモを元に、文章を整えてください：\n\n「${input.text}」`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Empty response from Claude');
  }
  const parsed = JSON.parse(extractJson(textBlock.text));
  if (typeof parsed.refinedText !== 'string') {
    throw new Error('refinedText is missing in response');
  }
  return { refinedText: parsed.refinedText };
}
