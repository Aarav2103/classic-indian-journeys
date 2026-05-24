import { Type } from "@google/genai";
import { z } from "zod";
import { genai, AI_MODEL } from "./client.js";
import Tour from "../models/Tour.js";
import { findTours } from "./search.js";

// Trip Planner agent. Given a brief (regions, length, style, group), the
// model calls tools backed by our REAL catalogue and assembles a grounded,
// day-by-day itinerary. Two tools:
//   - find_tours      : search real tours (reuses the search intent -> Mongo filter)
//   - present_itinerary: the model "returns" by calling this; its args ARE the
//                        structured itinerary (guarantees shape, no extra call).
// The agent may only reference tours that find_tours actually returned.

const MAX_TURNS = 6;
const SORTS = ["price-asc", "price-desc", "rating", "recommended"];

const findToursDecl = (regions) => ({
  name: "find_tours",
  description:
    "Search the REAL tour catalogue. Returns actual tours we sell. Call this (more than once if useful, e.g. per region or theme) to gather real options BEFORE composing the itinerary. Only tours returned here may be used in the plan.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      region: { type: Type.STRING, nullable: true, ...(regions.length ? { enum: regions } : {}), description: "Region slug filter." },
      keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Themes/places to match in tour text, e.g. ['wildlife','temple','backwaters']." },
      priceMax: { type: Type.NUMBER, nullable: true, description: "Max per-person price in INR." },
      durationMin: { type: Type.INTEGER, nullable: true },
      durationMax: { type: Type.INTEGER, nullable: true },
      minRating: { type: Type.NUMBER, nullable: true },
      sort: { type: Type.STRING, nullable: true, enum: SORTS },
    },
  },
});

const presentItineraryDecl = {
  name: "present_itinerary",
  description:
    "Deliver (or UPDATE) the full day-by-day itinerary. Call after gathering real tours with find_tours. Always send the COMPLETE current plan, not a diff. Use ONLY real tours you found and reference them by their exact id in basedOnTourIds.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: { type: Type.STRING, description: "A short, warm conversational reply to show the traveller alongside the plan, e.g. what you built or changed and why. 1-3 sentences." },
      title: { type: Type.STRING },
      summary: { type: Type.STRING, description: "1-2 sentence overview." },
      totalDays: { type: Type.INTEGER },
      estimatedPriceINR: { type: Type.NUMBER, description: "Indicative per-person total in INR, grounded in the real tour prices found." },
      days: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.INTEGER },
            title: { type: Type.STRING },
            description: { type: Type.STRING, description: "1-2 evocative but concise sentences." },
            region: { type: Type.STRING, nullable: true },
          },
          required: ["day", "title", "description"],
        },
      },
      basedOnTourIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exact ids of the real tours this plan draws on." },
      notes: { type: Type.STRING, description: "Honest caveats, what's flexible or would need confirming." },
    },
    required: ["title", "summary", "totalDays", "days", "basedOnTourIds"],
  },
};

const itinerarySchema = z
  .object({
    message: z.string().max(1200).optional().default(""),
    title: z.string().min(1).max(200),
    summary: z.string().max(1200).optional().default(""),
    totalDays: z.coerce.number().int().positive().max(60).optional(),
    estimatedPriceINR: z.coerce.number().nonnegative().optional(),
    days: z
      .array(
        z.object({
          day: z.coerce.number().int().positive(),
          title: z.string().min(1).max(200),
          description: z.string().max(1200).optional().default(""),
          region: z.string().max(80).optional().default(""),
        })
      )
      .min(1)
      .max(60),
    basedOnTourIds: z.array(z.string()).max(30).optional().default([]),
    notes: z.string().max(2000).optional().default(""),
  })
  .strip();

const buildSystem = (regions) => `You are a senior planner for a luxury INBOUND India travel studio. You build grounded, day-by-day itineraries using ONLY real tours from our catalogue.

Process:
1. Call find_tours to gather real tours that fit the brief, search per requested region and/or per theme; call it multiple times if helpful.
2. Compose a coherent day-by-day plan from those real tours: stitch regions together sensibly, respect the requested length (totalDays) and style, and keep travel realistic (don't zig-zag the country).
3. Call present_itinerary exactly once. List the exact ids of the real tours you used in basedOnTourIds. Set estimatedPriceINR from the real tour prices (indicative per person, INR). Use notes to be honest about what's flexible or needs confirming.

Rules:
- NEVER invent tours, cities, prices, or ids. Only reference tours returned by find_tours.
- If few or no tours match, build the best plan from what exists and say so in notes.
- The day count should match the requested length. All prices are INR.
- Available region slugs: ${regions.join(", ")}.`;

// Conversational variant (the chat planner). Same grounding rules, but the model
// is in an ongoing dialogue: it may ask ONE clarifying question, search, or
// (re)issue the full plan, and it carries a short chat `message` with each plan.
const buildChatSystem = (regions) => `You are a senior planner for a luxury INBOUND India travel studio, in an ongoing CHAT with a traveller. You build and refine grounded, day-by-day itineraries using ONLY real tours from our catalogue.

Each turn, do ONE of:
1. Ask ONE short clarifying question, ONLY when essential info is missing (rough length, or a region/interest) and you genuinely can't proceed. Prefer sensible assumptions over interrogating; don't ask more than one thing.
2. Call find_tours to gather real tours (per region/theme; call it more than once if useful).
3. Call present_itinerary to deliver or UPDATE the plan. Always send the COMPLETE current itinerary (not a diff), and put a short, warm reply in \`message\` saying what you built or changed.

When the traveller asks to change an existing plan (cheaper, longer, add wildlife, swap a city, different region...), modify the itinerary already on screen, keeping what still works, and re-issue the whole thing. Re-search with find_tours whenever the request introduces a new region or theme.

Rules:
- NEVER invent tours, cities, prices, or ids. Only reference tours returned by find_tours.
- Keep travel realistic (don't zig-zag the country); respect the requested length; all prices are INR.
- estimatedPriceINR is indicative per person, grounded in the real tour prices found.
- Be warm, concise and editorial. Available region slugs: ${regions.join(", ")}.`;

// Trim a client-supplied itinerary down to known fields before feeding it back
// to the model as context. Neutralises anything unexpected the client sent.
const compactItinerary = (itin = {}) => ({
  title: itin.title,
  summary: itin.summary,
  totalDays: itin.totalDays,
  estimatedPriceINR: itin.estimatedPriceINR,
  days: Array.isArray(itin.days)
    ? itin.days.slice(0, 60).map((d) => ({ day: d.day, title: d.title, description: d.description, region: d.region }))
    : [],
  basedOnTourIds: Array.isArray(itin.basedOnTourIds) ? itin.basedOnTourIds.slice(0, 30) : [],
});

const buildBrief = (brief = {}) => {
  const { request, regions = [], days, style, group, notes, refine } = brief;
  const parts = [];
  // Free-text request (from the smart box) leads, it's the richest signal.
  if (request) parts.push(`Traveller's request: "${request}".`);
  else parts.push("Plan an India journey for me.");
  if (days) parts.push(`Length: about ${days} days.`);
  if (regions.length) parts.push(`Regions of interest (slugs): ${regions.join(", ")}.`);
  if (style) parts.push(`Style: ${style}.`);
  if (group) parts.push(`Travellers: ${group}.`);
  if (notes) parts.push(`Extra notes: ${notes}.`);
  // Refinement instruction from a "refine chip", adjust the prior kind of plan.
  if (refine) parts.push(`Adjust the plan accordingly: ${refine}.`);
  parts.push("Gather real tours with find_tours, then call present_itinerary.");
  return parts.join(" ");
};

const runFindTours = async (args = {}) => {
  const intent = {
    region: args.region || undefined,
    priceMax: typeof args.priceMax === "number" ? args.priceMax : undefined,
    durationMin: Number.isInteger(args.durationMin) ? args.durationMin : undefined,
    durationMax: Number.isInteger(args.durationMax) ? args.durationMax : undefined,
    minRating: typeof args.minRating === "number" ? args.minRating : undefined,
    sort: SORTS.includes(args.sort) ? args.sort : undefined,
    keywords: Array.isArray(args.keywords) ? args.keywords.slice(0, 8) : [],
  };
  const tours = await findTours(intent, 8);
  return tours.map((t) => ({
    id: String(t._id),
    title: t.title,
    region: t.region,
    city: t.city,
    route: t.address,
    price: t.price,
    durationDays: t.duration,
    maxGroupSize: t.maxGroupSize,
    rating: t.avgRating,
    summary: t.overview || t.desc,
    tags: t.tags,
    highlights: t.highlights,
  }));
};

// Run the agent loop and return a validated itinerary object.
export const planTrip = async (brief = {}) => {
  if (!genai) throw new Error("AI is not configured");

  const regions = (await Tour.distinct("region")).filter(Boolean).sort();
  const tools = [{ functionDeclarations: [findToursDecl(regions), presentItineraryDecl] }];
  const systemInstruction = buildSystem(regions);
  const contents = [{ role: "user", parts: [{ text: buildBrief(brief) }] }];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // On the last couple of turns, force completion via present_itinerary.
    const functionCallingConfig =
      turn >= MAX_TURNS - 2
        ? { mode: "ANY", allowedFunctionNames: ["present_itinerary"] }
        : { mode: "ANY" };

    const res = await genai.models.generateContent({
      model: AI_MODEL,
      contents,
      config: { systemInstruction, temperature: 0.5, tools, toolConfig: { functionCallingConfig } },
    });

    const calls = res.functionCalls || [];
    const modelContent = res.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);

    if (!calls.length) {
      contents.push({ role: "user", parts: [{ text: "Call present_itinerary now with the final plan, using only tours you found." }] });
      continue;
    }

    const present = calls.find((c) => c.name === "present_itinerary");
    if (present) {
      const parsed = itinerarySchema.safeParse(present.args || {});
      if (!parsed.success) throw new Error("Agent produced an invalid itinerary");
      return parsed.data;
    }

    const parts = [];
    for (const c of calls) {
      if (c.name === "find_tours") {
        const tours = await runFindTours(c.args);
        parts.push({ functionResponse: { name: "find_tours", response: { tours } } });
      } else {
        parts.push({ functionResponse: { name: c.name, response: { error: "unknown tool" } } });
      }
    }
    contents.push({ role: "user", parts });
  }

  throw new Error("Agent did not finish in time");
};

// Conversational planner (the chat upgrade). Stateless: the client sends the
// whole short message history (role + text) plus the itinerary currently on
// screen, and we continue the agent. Each call returns ONE of:
//   - { reply, itinerary: null }: a chat reply / clarifying question
//   - { reply, itinerary: {...} }: a new or refined full plan (reply = the
//                                   model's `message`; controller resolves tours)
// Grounding rules are identical to planTrip, only real tours, by id.
export const planChat = async ({ messages = [], itinerary = null } = {}) => {
  if (!genai) throw new Error("AI is not configured");

  const regions = (await Tour.distinct("region")).filter(Boolean).sort();
  const tools = [{ functionDeclarations: [findToursDecl(regions), presentItineraryDecl] }];
  const systemInstruction = buildChatSystem(regions);

  const contents = [];
  // Ground the model in the plan currently shown to the traveller, if any, so
  // "make it cheaper / add Goa" refines that exact itinerary.
  if (itinerary && Array.isArray(itinerary.days) && itinerary.days.length) {
    contents.push({ role: "user", parts: [{ text: `(Context, the itinerary currently on the traveller's screen:)\n${JSON.stringify(compactItinerary(itinerary))}` }] });
    contents.push({ role: "model", parts: [{ text: "Got it, I have the current itinerary and will refine it as you ask." }] });
  }
  for (const m of messages) {
    if (!m?.content) continue;
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content) }] });
  }
  if (!contents.length) throw new Error("No conversation provided");

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await genai.models.generateContent({
      model: AI_MODEL,
      contents,
      // AUTO (not ANY): the model may also reply in plain text to ask a question.
      config: { systemInstruction, temperature: 0.6, tools, toolConfig: { functionCallingConfig: { mode: "AUTO" } } },
    });

    const calls = res.functionCalls || [];
    const modelContent = res.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);

    const present = calls.find((c) => c.name === "present_itinerary");
    if (present) {
      const parsed = itinerarySchema.safeParse(present.args || {});
      if (!parsed.success) throw new Error("Agent produced an invalid itinerary");
      const { message, ...itin } = parsed.data;
      return { reply: message || itin.summary || "Here's your updated itinerary.", itinerary: itin };
    }

    const finds = calls.filter((c) => c.name === "find_tours");
    if (finds.length) {
      const parts = [];
      for (const c of finds) {
        const tours = await runFindTours(c.args);
        parts.push({ functionResponse: { name: "find_tours", response: { tours } } });
      }
      contents.push({ role: "user", parts });
      continue;
    }

    // No tool call -> a plain conversational reply (e.g. a clarifying question).
    const text = (res.text || "").trim();
    if (text) return { reply: text, itinerary: null };

    contents.push({ role: "user", parts: [{ text: "Please reply now, either ask one brief clarifying question, or gather tours with find_tours and present an itinerary." }] });
  }

  throw new Error("Agent did not finish in time");
};
