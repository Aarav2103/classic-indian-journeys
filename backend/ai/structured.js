import { genai, AI_MODEL } from "./client.js";

// Reusable structured-output helper, the second foundation piece. Sends
// `system` + `userText` to Gemini, constrains the reply to `responseSchema`
// (Gemini Schema shape) via JSON mode, then parses and returns the object.
// Reused by the review-intelligence extraction pipeline.
//
// temperature 0 keeps extraction deterministic. Throws on unconfigured AI,
// empty output, or unparseable JSON so callers can map it to a clean 502.
export const generateStructured = async ({ system, userText, responseSchema, model }) => {
  if (!genai) throw new Error("AI is not configured");

  const res = await genai.models.generateContent({
    model: model || AI_MODEL,
    contents: userText,
    config: {
      ...(system ? { systemInstruction: system } : {}),
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0,
    },
  });

  const text = res.text;
  if (!text) throw new Error("AI returned an empty response");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("AI returned malformed JSON");
  }
};
