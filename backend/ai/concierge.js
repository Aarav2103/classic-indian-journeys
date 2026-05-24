import { Type } from "@google/genai";
import { genai, AI_MODEL, newUsage, accUsage } from "./client.js";
import Tour from "../models/Tour.js";
import { findTours } from "./search.js";
import { retrieveKnowledge } from "./retrieve.js";

// RAG concierge. Tool-using agent that answers traveller questions off two
// retrieval paths:
//   search_knowledge  Atlas Vector Search over the authored corpus (FAQs,
//                     policies, health, region and seasonal guides). The RAG half,
//                     covering what structured search can't.
//   find_tours        the structured catalogue search, reused as a tool. Catalogue
//                     stays structured, knowledge stays vector, so they don't
//                     overlap.
// Model picks. It doesn't get to invent policy or tours: factual claims come from
// search_knowledge, named journeys come from find_tours. Full day-by-day plans get
// handed off to /plan. Stateless multi-turn like planChat, client sends history.

const MAX_TURNS = 5;
// Exported so the ablation baseline (ai/conciergeStuffed.js) reuses the EXACT same
// catalogue tool, keeping retrieval-vs-stuffing the only variable in the eval.
export const SORTS = ["price-asc", "price-desc", "rating", "recommended"];
export const KNOWLEDGE_CATEGORIES = ["faq", "policy", "guide", "region-guide", "tour-info", "permit"];

const searchKnowledgeDecl = (regions) => ({
  name: "search_knowledge",
  description:
    "Search the studio's KNOWLEDGE BASE: FAQs, booking/cancellation/payment policies, permit & health info, per-journey fine print (what's included), and per-region & seasonal travel guides. Use this for ANY question about policy, logistics, seasons/'best time', what's included, permits, safety, or how travel in a region works. Returns grounded passages; base your answer ONLY on what it returns.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The question or key phrase to look up." },
      category: { type: Type.STRING, nullable: true, enum: KNOWLEDGE_CATEGORIES, description: "Optional filter: faq, policy, guide, region-guide, tour-info (per-journey what's-included/good-to-know), or permit (Inner Line / protected-area permits)." },
      region: { type: Type.STRING, nullable: true, ...(regions.length ? { enum: regions } : {}), description: "Optional region slug filter." },
    },
    required: ["query"],
  },
});

export const findToursDecl = (regions) => ({
  name: "find_tours",
  description:
    "Search the REAL tour catalogue and return actual journeys we sell. Use when the traveller asks which tours/journeys match criteria (region, theme, budget, length) or to suggest concrete journeys. Only journeys returned here may be named.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      region: { type: Type.STRING, nullable: true, ...(regions.length ? { enum: regions } : {}), description: "Region slug filter." },
      keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Themes/places, e.g. ['wildlife','temple','backwaters']." },
      priceMax: { type: Type.NUMBER, nullable: true, description: "Max per-person price in INR." },
      durationMin: { type: Type.INTEGER, nullable: true },
      durationMax: { type: Type.INTEGER, nullable: true },
      minRating: { type: Type.NUMBER, nullable: true },
      sort: { type: Type.STRING, nullable: true, enum: SORTS },
    },
  },
});

const buildSystem = (regions) => `You are the concierge for a luxury India travel studio that crafts private journeys WITHIN India for discerning Indian travellers, warm, editorial, and genuinely helpful. You answer travellers' questions in a quiet, unhurried voice, but always with a real, useful answer. These are DOMESTIC journeys (no visa, no international arrival). All prices are INR.

Your tools:
- search_knowledge: the studio's FAQs, policies, permit/health info, per-journey fine print, and region & seasonal guides. Call it for ANY question about policy, payments, cancellation, what's included, permits, health, safety, seasons/"best time", or how a region works.
- find_tours: the real journey catalogue. Call it when the traveller wants journey suggestions or asks which trips match a region/theme/budget/length.

Rules:
- GROUND every factual answer in search_knowledge results. If the knowledge base has nothing relevant, say so honestly and offer to connect them with the team, NEVER invent policy, prices, permit rules, or guarantees.
- For HEALTH or MEDICAL questions (altitude/AMS, illness, fitness, what to take): state ONLY what the knowledge base says, then advise consulting a doctor. Never invent medical specifics, precautions, dosages, or hygiene tips that aren't in the passages.
- Only name journeys that find_tours actually returned. Never invent tours, cities, or prices.
- Be concise: usually 2-5 sentences. Lead with the answer. Don't pad.
- For a request to BUILD a full multi-day, day-by-day itinerary, don't construct it here, answer any questions, then tell them our Plan a Journey tool can craft a grounded day-by-day itinerary and invite them to use it.
- Available region slugs: ${regions.join(", ")}.`;

// Map a find_tours tool call -> real tours (reusing the structured search).
export const runFindTours = async (args = {}) => {
  const intent = {
    region: args.region || undefined,
    priceMax: typeof args.priceMax === "number" ? args.priceMax : undefined,
    durationMin: Number.isInteger(args.durationMin) ? args.durationMin : undefined,
    durationMax: Number.isInteger(args.durationMax) ? args.durationMax : undefined,
    minRating: typeof args.minRating === "number" ? args.minRating : undefined,
    sort: SORTS.includes(args.sort) ? args.sort : undefined,
    keywords: Array.isArray(args.keywords) ? args.keywords.slice(0, 8) : [],
  };
  const tours = await findTours(intent, 6);
  return tours.map((t) => ({
    id: String(t._id),
    title: t.title,
    region: t.region,
    route: t.address,
    price: t.price,
    durationDays: t.duration,
    rating: t.avgRating,
    summary: t.overview || t.desc,
    tags: t.tags,
  }));
};

// Run the concierge loop. Returns { reply, sources, tourIds }:
//   reply, the model's grounded text answer
//   sources, the knowledge chunks that grounded it (deduped, best first) for citation
//   tourIds, ids of journeys it surfaced via find_tours (controller resolves to docs)
export const askConcierge = async ({ messages = [], temperature = 0.5 } = {}) => {
  if (!genai) throw new Error("AI is not configured");

  const regions = (await Tour.distinct("region")).filter(Boolean).sort();
  const tools = [{ functionDeclarations: [searchKnowledgeDecl(regions), findToursDecl(regions)] }];
  const systemInstruction = buildSystem(regions);

  const contents = [];
  for (const m of messages) {
    if (!m?.content) continue;
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content) }] });
  }
  if (!contents.length) throw new Error("No conversation provided");

  // The raw latest user question, a retrieval safety net (below) so the model can't
  // starve its own grounding with an over-narrow search query or category filter.
  const lastUserText = String([...messages].reverse().find((m) => m?.content && m.role !== "assistant")?.content || "");

  const knowledgeById = new Map(); // id -> { chunk, score }, accumulates sources
  const tourIds = new Set();
  const usage = newUsage(); // token accounting across turns (for the eval ablation)

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
        if (c.name === "search_knowledge") {
          const modelQuery = c.args?.query || lastUserText;
          const category = KNOWLEDGE_CATEGORIES.includes(c.args?.category) ? c.args.category : undefined;
          const region = regions.includes(c.args?.region) ? c.args.region : undefined;
          // Retrieve on the model's (possibly filtered) query AND on the raw user
          // question unfiltered, then merge (model-query first). The safety net means
          // an over-narrow query or a wrong category guess can't hide a relevant chunk
          // (a bad category filter once starved a region's etiquette chunk).
          const [primary, safety] = await Promise.all([
            retrieveKnowledge(modelQuery, { k: 8, category, region }),
            lastUserText && lastUserText !== modelQuery ? retrieveKnowledge(lastUserText, { k: 8 }) : Promise.resolve([]),
          ]);
          const seen = new Set();
          const hits = [];
          for (const h of [...primary, ...safety]) {
            const id = String(h._id);
            if (seen.has(id)) continue;
            seen.add(id);
            hits.push(h);
            const prev = knowledgeById.get(id);
            if (!prev || h.score > prev.score) knowledgeById.set(id, { chunk: h, score: h.score });
          }
          const top = hits.slice(0, 8);
          // Hand the model only the grounding text it needs (no vectors/ids of ours).
          parts.push({
            functionResponse: {
              name: "search_knowledge",
              response: { passages: top.map((h) => ({ title: h.title, source: h.sourceTitle, category: h.category, text: h.body })) },
            },
          });
        } else if (c.name === "find_tours") {
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

    // No tool call -> the model's final text answer.
    const text = (res.text || "").trim();
    if (text) {
      const sources = [...knowledgeById.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ chunk }) => ({
          id: String(chunk._id),
          title: chunk.title,
          category: chunk.category,
          sourceTitle: chunk.sourceTitle,
          region: chunk.region || "",
          // First referenced tour, lets a tour-info citation deep-link to /tours/:id.
          tourRef: chunk.tourRefs?.[0] ? String(chunk.tourRefs[0]) : "",
        }));
      return { reply: text, sources, tourIds: [...tourIds], usage };
    }

    contents.push({ role: "user", parts: [{ text: "Please answer now, grounded in the knowledge base (use search_knowledge), and suggest journeys with find_tours if relevant." }] });
  }

  throw new Error("Concierge did not finish in time");
};
