import { Type } from "@google/genai";
import { z } from "zod";
import Tour from "../models/Tour.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { generateStructured } from "./structured.js";

// Natural-language -> MongoDB search.
//
// The model NEVER emits raw Mongo. It emits a small, fixed-shape "intent"
// object; we validate it with zod and build the Mongo query ourselves
// (intentToMongoFilter). That's the security boundary, no operator/NoSQL
// injection, and the reusable piece: parseSearchIntent + intentToMongoFilter
// become a tool for the Trip Planner agent.

const SORTS = ["price-asc", "price-desc", "rating", "recommended"];

// Deterministic keyword fallback. Small models sometimes drop theme words
// (e.g. "wildlife tours under 2 lakh" -> no keywords). When the model returns
// none, we extract salient words from the query ourselves, stripping generic /
// price / duration / group terms so only real themes remain.
const STOPWORDS = new Set([
  "luxury", "premium", "best", "amazing", "nice", "good", "great", "trip", "trips", "tour", "tours",
  "journey", "journeys", "holiday", "holidays", "vacation", "package", "packages", "travel", "india",
  "indian", "the", "for", "with", "want", "need", "looking", "show", "find", "get", "some", "that",
  "this", "and", "near", "around", "about", "approx", "approximately",
  "under", "below", "over", "above", "between", "cheap", "cheapest", "expensive", "affordable",
  "budget", "lakh", "lakhs", "crore", "rupees", "rupee", "inr", "price", "priced", "cost",
  "day", "days", "night", "nights", "week", "weeks", "month", "months", "person", "people", "pax",
  "group", "family", "families", "couple", "couples", "solo", "private", "traveller", "travellers",
  "traveler", "travelers", "rated", "rating", "star", "stars", "top",
]);

// Deterministic price safety net for when the model omits a stated budget.
const UNIT_MULT = { l: 1e5, lakh: 1e5, lakhs: 1e5, cr: 1e7, crore: 1e7, crores: 1e7, k: 1e3, thousand: 1e3 };
const toAmount = (num, unit) => {
  const n = parseFloat(num);
  if (!isFinite(n)) return null;
  return Math.round(n * (unit ? UNIT_MULT[unit.toLowerCase()] || 1 : 1));
};
const NUM = "(\\d+(?:\\.\\d+)?)\\s*(lakhs?|crores?|cr|k|thousand|l)?";
const extractPrice = (query = "") => {
  const q = query.toLowerCase();
  let m;
  if ((m = q.match(new RegExp("(?:under|below|less than|upto|up to|within|max|budget(?: of)?)\\s*₹?\\s*" + NUM)))) {
    const amt = toAmount(m[1], m[2]);
    if (amt) return { priceMax: amt };
  }
  if ((m = q.match(new RegExp("(?:over|above|more than|from|at least|minimum)\\s*₹?\\s*" + NUM)))) {
    const amt = toAmount(m[1], m[2]);
    if (amt) return { priceMin: amt };
  }
  // A unit-bearing amount with no direction word -> treat as a budget ceiling.
  if ((m = q.match(/(\d+(?:\.\d+)?)\s*(lakhs?|crores?|cr|k)\b/i))) {
    const amt = toAmount(m[1], m[2]);
    if (amt && amt >= 1000) return { priceMax: amt };
  }
  return null;
};

const extractKeywords = (query = "") => {
  const seen = new Set();
  const out = [];
  for (const tok of query.toLowerCase().match(/[a-z]+/g) || []) {
    if (tok.length < 3 || STOPWORDS.has(tok) || seen.has(tok)) continue;
    seen.add(tok);
    out.push(tok);
    if (out.length >= 3) break;
  }
  return out;
};

// Validation/clamping net over the model output (JSON mode already constrains
// the shape; this guards ranges and strips anything unexpected).
const searchIntentSchema = z
  .object({
    region: z.string().max(80).nullish(),
    city: z.string().max(120).nullish(),
    priceMin: z.coerce.number().nonnegative().nullish(),
    priceMax: z.coerce.number().nonnegative().nullish(),
    durationMin: z.coerce.number().int().positive().max(365).nullish(),
    durationMax: z.coerce.number().int().positive().max(365).nullish(),
    minGroupSize: z.coerce.number().int().positive().max(100).nullish(),
    minRating: z.coerce.number().min(0).max(5).nullish(),
    featured: z.boolean().nullish(),
    sort: z.enum(SORTS).nullish(),
    keywords: z.array(z.string().min(1).max(50)).max(12).optional().default([]),
  })
  .strip();

// Build the Gemini response schema, constraining `region` to the regions that
// actually exist so the model can't invent one.
const buildResponseSchema = (regions) => ({
  type: Type.OBJECT,
  properties: {
    region: { type: Type.STRING, nullable: true, ...(regions.length ? { enum: regions } : {}) },
    city: { type: Type.STRING, nullable: true },
    priceMin: { type: Type.NUMBER, nullable: true },
    priceMax: { type: Type.NUMBER, nullable: true },
    durationMin: { type: Type.INTEGER, nullable: true },
    durationMax: { type: Type.INTEGER, nullable: true },
    minGroupSize: { type: Type.INTEGER, nullable: true },
    minRating: { type: Type.NUMBER, nullable: true },
    featured: { type: Type.BOOLEAN, nullable: true },
    sort: { type: Type.STRING, nullable: true, enum: SORTS },
    keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
});

const buildSystem = (regions) => `You convert a traveller's free-text query into a structured search intent for an INBOUND India luxury-tour catalogue. Output ONLY the JSON for the given schema.

Tour fields you can target:
- region (enum, slugs): ${regions.join(", ")}
- price: per-person trip cost in INR (typical range ₹80,000-₹300,000). Map "under/below X" to priceMax, "over/above X" to priceMin. Interpret "1 lakh" = 100000, "50k" = 50000.
- duration: trip length in DAYS. For an EXACT count ("10 days") set durationMin=durationMax. For an APPROXIMATE count ("around 2 weeks", "about 10 days", "a week") set a RANGE spanning roughly ±2-3 days (e.g. "around 2 weeks" -> durationMin 12, durationMax 16; "a week" -> 5-8). Use only durationMax for "up to / at most" and only durationMin for "at least".
- maxGroupSize: set minGroupSize when the user implies a party size ("family of 6" -> minGroupSize 6).
- avgRating (0-5): set minRating for "highly rated", "best reviewed" (e.g. 4.5).
- featured: true only if the user asks for featured/recommended/popular picks.
- sort: one of ${SORTS.join(", ")} when the user implies ordering ("cheapest" -> price-asc, "most luxurious/expensive" -> price-desc, "best rated" -> rating).

Rules:
- Only set a field the query clearly implies; leave everything else null.
- ALWAYS put concrete themes into keywords, e.g. "beach", "temple", "wildlife", "tiger", "safari", "backwaters", "trek", "desert", "honeymoon", "spiritual", or a specific place/city. Themes are the main signal; never drop them, and never convert a theme into a region instead of a keyword (you may set BOTH a region and keywords).
- Do NOT put generic, non-distinguishing words in keywords, every tour here is a premium India journey, so words like "luxury", "premium", "best", "amazing", "trip", "tour", "tours", "journey", "holiday", "vacation", "package", "india", "travel" carry no signal. Omit them.
- Never invent regions, prices, or constraints the user didn't express.

Examples (query -> JSON):
- "wildlife tours under 2 lakh" -> {"priceMax":200000,"keywords":["wildlife"]}
- "tiger safaris" -> {"keywords":["tiger","safari"]}
- "beach honeymoon in goa" -> {"keywords":["beach","honeymoon","goa"]}
- "cheapest rajasthan heritage trips" -> {"region":"rajasthan","sort":"price-asc","keywords":["heritage"]}
- "10 day temple tour of south india" -> {"region":"south-india","durationMin":9,"durationMax":11,"keywords":["temple"]}`;

// Parse a free-text query into a validated search intent.
export const parseSearchIntent = async (query) => {
  const regions = (await Tour.distinct("region")).filter(Boolean).sort();
  const raw = await generateStructured({
    system: buildSystem(regions),
    userText: query,
    responseSchema: buildResponseSchema(regions),
  });
  const parsed = searchIntentSchema.safeParse(raw);
  if (!parsed.success) {
    // Model returned an unexpected shape, degrade to a plain keyword search
    // on the raw query rather than failing the request.
    return { keywords: extractKeywords(query) };
  }
  // Safety net: if the model dropped all theme words, recover them from the query.
  if (!parsed.data.keywords?.length) {
    parsed.data.keywords = extractKeywords(query);
  }
  // Safety net: if the model omitted a stated budget, parse it deterministically.
  if (parsed.data.priceMin == null && parsed.data.priceMax == null) {
    const price = extractPrice(query);
    if (price) Object.assign(parsed.data, price);
  }
  return parsed.data;
};

// Translate a validated intent into a safe Mongo filter. All text reaching a
// RegExp is escaped. Structured fields narrow precisely; keywords add thematic
// recall (OR across text fields), AND-ed implicitly with the structured fields.
export const intentToMongoFilter = (intent) => {
  const filter = {};

  if (intent.region) filter.region = new RegExp(`^${escapeRegex(intent.region)}$`, "i");
  if (intent.city) filter.city = new RegExp(escapeRegex(intent.city), "i");

  const price = {};
  if (intent.priceMin != null) price.$gte = intent.priceMin;
  if (intent.priceMax != null) price.$lte = intent.priceMax;
  if (Object.keys(price).length) filter.price = price;

  const duration = {};
  if (intent.durationMin != null) duration.$gte = intent.durationMin;
  if (intent.durationMax != null) duration.$lte = intent.durationMax;
  if (Object.keys(duration).length) filter.duration = duration;

  if (intent.minGroupSize != null) filter.maxGroupSize = { $gte: intent.minGroupSize };
  if (intent.minRating != null) filter.avgRating = { $gte: intent.minRating };
  if (typeof intent.featured === "boolean") filter.featured = intent.featured;

  if (intent.keywords?.length) {
    // Includes `tags` (controlled themes) and `overview`/`highlights` so a theme
    // word like "wildlife" matches the tag precisely, not just literal text.
    const fields = ["title", "desc", "overview", "tags", "highlights", "city", "address", "region"];
    const or = [];
    for (const kw of intent.keywords) {
      const rx = new RegExp(escapeRegex(kw), "i");
      for (const f of fields) or.push({ [f]: rx });
    }
    if (or.length) filter.$or = or;
  }

  return filter;
};

export const intentToSort = (intent) => {
  switch (intent.sort) {
    case "price-asc":
      return { price: 1 };
    case "price-desc":
      return { price: -1 };
    case "rating":
      return { avgRating: -1 };
    default:
      return { featured: -1, createdAt: -1 };
  }
};

// Run a search intent against the catalogue. Reused by the AI search endpoint
// and the Trip Planner agent's find_tours tool.
export const findTours = (intent, limit = 12) =>
  Tour.find(intentToMongoFilter(intent)).sort(intentToSort(intent)).limit(limit);

export { searchIntentSchema };
  