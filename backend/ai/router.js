import { Type } from "@google/genai";
import { generateStructured } from "./structured.js";

// Intent router for the single "smart box". Decides whether a free-text message
// wants matching tours (find) or a bespoke day-by-day itinerary (plan). One
// cheap structured call; falls back to "find" on anything ambiguous.
const intentResponseSchema = {
  type: Type.OBJECT,
  properties: { intent: { type: Type.STRING, enum: ["find", "plan"] } },
  required: ["intent"],
};

const SYSTEM = `Classify a traveller's message to an India tour website into ONE intent:
- "plan": they want a custom multi-day itinerary or trip plan. Signals: "plan", "itinerary", "build me...", a day/night/week count for a trip, stitching multiple places, "honeymoon/holiday for N days".
- "find": they want to browse or search existing tours by criteria. Signals: "show me", "tours", "trips under ₹X", a single region/theme, "cheapest", "best rated".
If genuinely ambiguous, choose "find". Output only the intent.`;

export const classifyIntent = async (query) => {
  try {
    const out = await generateStructured({ system: SYSTEM, userText: query, responseSchema: intentResponseSchema });
    return out?.intent === "plan" ? "plan" : "find";
  } catch {
    return "find";
  }
};
