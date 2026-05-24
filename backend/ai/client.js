// One shared Gemini client for everything that needs it: search, the planner
// agent, the concierge, review extraction.
//
// Opt-in. No GEMINI_API_KEY means genai is null and callers degrade instead of
// breaking: search returns 503, the UI falls back to keyword filters. Same shape
// as the optional SMTP setup in utils/mailer.js.
//
// dotenv.config() runs here rather than trusting index.js. ESM imports evaluate
// before the importing module's body, so this can load before index.js gets to its
// own config() call. Doing it here means the key is definitely there by the time
// it's read below.
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Default chosen for the free-tier DAILY limit (RPD), which is the binding
// constraint on this account: gemini-3.1-flash-lite allows 500 req/day & 15 RPM,
// vs only 20 req/day on gemini-2.5-flash / 2.5-flash-lite (and 0 on 2.0-flash).
// Override via GEMINI_MODEL: e.g. "gemini-2.5-flash" for a bit more quality at
// 20/day. Structured output + function calling both verified on this model.
export const AI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const apiKey = process.env.GEMINI_API_KEY;

export const genai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const isAIConfigured = () => Boolean(genai);

// Token-usage accounting across multi-turn generateContent loops. Used by the
// concierge + its ablation baseline so the eval harness can compare real prompt-
// token cost (RAG retrieval vs full-context stuffing), not just answer quality.
export const newUsage = () => ({ promptTokens: 0, candidatesTokens: 0, totalTokens: 0, calls: 0 });

export const accUsage = (acc, res) => {
  const u = res?.usageMetadata;
  if (!u) return acc;
  acc.promptTokens += u.promptTokenCount || 0;
  acc.candidatesTokens += u.candidatesTokenCount || 0;
  acc.totalTokens += u.totalTokenCount || 0;
  acc.calls += 1;
  return acc;
};

if (!genai) {
  console.info("[ai] GEMINI_API_KEY not set, AI features are disabled.");
}
