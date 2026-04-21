import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Vercel / ローカルどちらの環境変数名でも拾えるようにフォールバック
const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY;

export const ai = genkit({
  plugins: [googleAI(apiKey ? { apiKey } : {})],
  model: 'googleai/gemini-2.5-flash',
});
