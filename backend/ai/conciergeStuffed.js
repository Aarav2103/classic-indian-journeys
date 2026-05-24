import { genai, AI_MODEL, newUsage, accUsage } from "./client.js";
import Tour from "../models/Tour.js";
import KnowledgeArticle from "../models/KnowledgeArticle.js";
import { findToursDecl, runFindTours } from "./concierge.js";

// Ablation baseline, evals only. Same concierge as ai/concierge.js in every
// respect except how knowledge gets to the model: the entire corpus goes into the
// system prompt up front and there's no retrieval tool at all. find_tours is kept
// identical so the only thing varying is retrieval vs stuffing.
//
// evals/ablation.js runs the two head to head for quality, prompt tokens and
// latency. At this corpus size a quality tie with a big token gap is the expected
// result, not a failure. It's the first point on the curve.

const MAX_TURNS = 5;

const buildSystem = (regions, corpus) => `You are the concierge for a luxury India travel studio that crafts private journeys WITHIN India for discerning Indian travellers, warm, editorial, and genuinely helpful. You answer travellers' questions in a quiet, unhurried voice, but always with a real, useful answer. These are DOMESTIC journeys (no visa, no international arrival). All prices are INR.

You have ONE tool:
- find_tours: the real journey catalogue. Call it when the traveller wants journey suggestions or asks which trips match a region/theme/budget/length.

The studio's ENTIRE knowledge base (FAQs, policies, permit/health info, per-journey fine print, region & seasonal guides) is provided in full below. Ground every factual answer ONLY in it.

Rules:
- GROUND every factual answer in the KNOWLEDGE BASE below. If it doesn't cover something, say so honestly and offer to connect them with the team, NEVER invent policy, prices, permit rules, or guarantees.
- For HEALTH or MEDICAL questions (altitude/AMS, illness, fitness, what to take): state ONLY what the knowledge base says, then advise consulting a doctor. Never invent medical specifics, precautions, dosages, or hygiene tips that aren't in it.
- Only name journeys that find_tours actually returned. Never invent tours, cities, or prices.
- Be concise: usually 2-5 sentences. Lead with the answer. Don't pad.
- For a request to BUILD a full multi-day, day-by-day itinerary, don't construct it here, tell them our Plan a Journey tool can craft a grounded day-by-day itinerary and invite them to use it.
- Available region slugs: ${regions.join(", ")}.

[KNOWLEDGE BASE]
${corpus}
[END KNOWLEDGE BASE]`;

// Flatten the whole corpus into a single prompt block (no embeddings, that's the
// point). Mirrors the per-passage formatting the RAG arm hands the model, so the
// only difference is quantity (all chunks vs the retrieved few), not formatting.
const loadCorpus = async () => {
  const docs = await KnowledgeArticle.find({}, "title body category sourceTitle region").lean();
  return docs
    .map((d, i) => `[${i + 1}] (${d.category}${d.region ? `/${d.region}` : ""}) ${d.title}${d.sourceTitle ? `: ${d.sourceTitle}` : ""}\n${d.body}`)
    .join("\n\n");
};

// Same loop shape as askConcierge, minus search_knowledge. Returns { reply,
// tourIds, usage } (no `sources`, there is no retrieval step to cite).
export const askConciergeStuffed = async ({ messages = [], temperature = 0.5 } = {}) => {
  if (!genai) throw new Error("AI is not configured");

  const regions = (await Tour.distinct("region")).filter(Boolean).sort();
  const corpus = await loadCorpus();
  const tools = [{ functionDeclarations: [findToursDecl(regions)] }];
  const systemInstruction = buildSystem(regions, corpus);

  const contents = [];
  for (const m of messages) {
    if (!m?.content) continue;
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content) }] });
  }
  if (!contents.length) throw new Error("No conversation provided");

  const tourIds = new Set();
  const usage = newUsage();

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await genai.models.generateContent({
      model: AI_MODEL,
      contents,
      config: { systemInstruction, temperature, tools, toolConfig: { functionCallingConfig: { mode: "AUTO" } } },
    });
    accUsage(usage, res);

    const calls = res.functionCalls || [];
    const modelContent = res.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);

    if (calls.length) {
      const parts = [];
      for (const c of calls) {
        if (c.name === "find_tours") {
          const tours = await runFindTours(c.args);
          for (const t of tours) tourIds.add(t.id);
          parts.push({ functionResponse: { name: "find_tours", response: { tours } } });
        } else {
          parts.push({ functionResponse: { name: c.name, response: { error: "unknown tool" } } });
        }
      }
      contents.push({ role: "user", parts });
      continue;
    }

    const text = (res.text || "").trim();
    if (text) return { reply: text, tourIds: [...tourIds], usage };

    contents.push({ role: "user", parts: [{ text: "Please answer now, grounded ONLY in the knowledge base provided in your instructions, and suggest journeys with find_tours if relevant." }] });
  }

  throw new Error("Stuffed concierge did not finish in time");
};
