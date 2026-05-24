import { Type } from "@google/genai";
import Review from "../models/Review.js";
import Tour from "../models/Tour.js";
import { generateStructured } from "./structured.js";
import { isAIConfigured } from "./client.js";

// Review intelligence. Small pipeline over each tour's freetext reviews: sentiment
// per review, plus aspect sentiment for which parts of the trip got praised or
// complained about. Rolls up into a pros/cons summary and per-aspect scores cached
// on the Tour, same pattern as the avgRating/reviewCount cache. Reviews stay the
// source of truth, this is just a read-optimised aggregate.
//
// One model call per tour handles all its reviews and writes the summary, which
// keeps the whole catalogue at ~42 calls instead of one per review and well inside
// the free daily cap. The numeric rollup is then computed in JS from the per-review
// labels, so the bars can't drift away from the classifications behind them.

// Controlled aspect vocabulary, the facets travellers actually comment on for a
// guided journey. Keeping it closed makes the rollup consistent and filterable;
// the model is constrained to this enum, so the UI can rely on a fixed label set.
export const ASPECTS = [
  "guide",        // the guide / driver, knowledge, warmth, language
  "itinerary",    // the route, sights, what was seen
  "value",        // price vs. what you got
  "comfort",      // hotels, vehicles, rooms
  "hospitality",  // service, care, the studio's attentiveness
  "food",         // meals, cuisine, dietary care
  "pace",         // how rushed/relaxed the days felt
  "organisation", // logistics, transfers, punctuality, planning
];

export const SENTIMENTS = ["positive", "neutral", "negative"];

// Generating insights from one or two reviews is noise, not signal. Below this
// we leave reviewInsights empty and the UI simply shows the raw reviews.
export const MIN_REVIEWS_FOR_INSIGHTS = 3;

const ASPECT_LABELS = ASPECTS.join(", ");

// One batched structured response: a label set per review (aligned to input
// order) plus a tour-level editorial summary. Mixing per-review classification
// with the summary in a single call is what keeps this to ~1 request per tour.
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    reviews: {
      type: Type.ARRAY,
      description: "One analysis per input review, in the SAME order as given.",
      items: {
        type: Type.OBJECT,
        properties: {
          sentiment: { type: Type.STRING, enum: SENTIMENTS },
          aspects: {
            type: Type.ARRAY,
            description: "Only the aspects this review actually discusses.",
            items: {
              type: Type.OBJECT,
              properties: {
                aspect: { type: Type.STRING, enum: ASPECTS },
                sentiment: { type: Type.STRING, enum: SENTIMENTS },
              },
              required: ["aspect", "sentiment"],
            },
          },
        },
        required: ["sentiment", "aspects"],
      },
    },
    summary: { type: Type.STRING, description: "1-2 sentence editorial synthesis of what guests felt." },
    pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-4 short recurring strengths." },
    cons: { type: Type.ARRAY, items: { type: Type.STRING }, description: "0-3 short recurring caveats; [] if none." },
  },
  required: ["reviews", "summary", "pros", "cons"],
};

const SYSTEM = `You are an analyst for a luxury INBOUND-to-India travel studio. You read the real guest reviews for ONE journey and produce a faithful, grounded analysis. You do not invent praise or complaints, every label and every pro/con must be supported by what guests actually wrote.

For EACH review, in order, return:
- sentiment: the review's overall tone (positive | neutral | negative). Weigh the words, not just the star rating.
- aspects: ONLY the aspects the review genuinely discusses, each with its own sentiment. Choose aspects from this fixed list: ${ASPECT_LABELS}. Omit aspects the review doesn't mention. A single review usually touches 1-4 aspects.

Then, across ALL the reviews, return:
- summary: 1-2 calm, editorial sentences (the studio's quiet, understated voice) capturing the consensus, honest, not salesy.
- pros: 2-4 short phrases naming the strengths guests repeat (e.g. "Exceptional, knowledgeable guides").
- cons: 0-3 short phrases naming recurring caveats guests raise (e.g. "Days can feel rushed"). Return [] only if there is genuinely no recurring criticism, do not manufacture one.

Be truthful and specific. Ground everything in the reviews provided.`;

const buildUserText = (tour, reviews) => {
  const head = `Journey: "${tour.title}"${tour.address ? ` (${tour.address})` : ""}${tour.region ? `, ${tour.region}` : ""}.`;
  const body = reviews
    .map((r, i) => `Review ${i + 1} [${r.rating ?? "?"}★]: ${String(r.reviewText || "").trim()}`)
    .join("\n\n");
  return `${head}\n\nGuest reviews (analyse each, in order):\n\n${body}`;
};

const clampSentiment = (s) => (SENTIMENTS.includes(s) ? s : "neutral");

// Sanitise + align the model's per-review labels to the input reviews. The schema
// constrains shapes, but we still guard length/enum drift so a bad row can never
// corrupt the rollup, anything off falls back to a neutral, aspect-less label.
const normalizePerReview = (out, count) => {
  const rows = Array.isArray(out?.reviews) ? out.reviews : [];
  const result = [];
  for (let i = 0; i < count; i++) {
    const row = rows[i] || {};
    const seen = new Set();
    const aspects = (Array.isArray(row.aspects) ? row.aspects : [])
      .filter((a) => ASPECTS.includes(a?.aspect) && !seen.has(a.aspect) && seen.add(a.aspect))
      .map((a) => ({ aspect: a.aspect, sentiment: clampSentiment(a.sentiment) }));
    result.push({ sentiment: clampSentiment(row.sentiment), aspects });
  }
  return result;
};

// Deterministically roll the per-review labels up into the cached tour aggregate.
// score = positives / (positives + negatives) as a 0-100 percentage (neutrals are
// counted as mentions but don't move the score). Aspects are ordered by signal
// (mentions) then score, so the UI can show the most-discussed facets first.
export const aggregateInsights = (perReview) => {
  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  const byAspect = new Map();

  for (const r of perReview) {
    sentiment[r.sentiment] = (sentiment[r.sentiment] || 0) + 1;
    for (const a of r.aspects) {
      const cur = byAspect.get(a.aspect) || { aspect: a.aspect, positive: 0, neutral: 0, negative: 0, mentions: 0 };
      cur[a.sentiment] += 1;
      cur.mentions += 1;
      byAspect.set(a.aspect, cur);
    }
  }

  const aspects = [...byAspect.values()]
    .map((a) => {
      const polar = a.positive + a.negative;
      return { ...a, score: polar ? Math.round((a.positive / polar) * 100) : 50 };
    })
    .sort((x, y) => y.mentions - x.mentions || y.score - x.score);

  return { sentiment, aspects };
};

// Analyse one tour's reviews in a single LLM call. Returns null when there's too
// little signal. Throws on AI/parse failure so the batch runner can retry.
export const analyzeTourReviews = async (tour, reviews) => {
  if (!isAIConfigured()) throw new Error("AI is not configured");
  const usable = (reviews || []).filter((r) => String(r.reviewText || "").trim().length > 0);
  if (usable.length < MIN_REVIEWS_FOR_INSIGHTS) return null;

  const out = await generateStructured({
    system: SYSTEM,
    userText: buildUserText(tour, usable),
    responseSchema,
  });

  const perReview = normalizePerReview(out, usable.length);
  const { sentiment, aspects } = aggregateInsights(perReview);

  const insights = {
    summary: String(out.summary || "").trim(),
    pros: (Array.isArray(out.pros) ? out.pros : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 4),
    cons: (Array.isArray(out.cons) ? out.cons : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 3),
    aspects,
    sentiment,
    basedOn: usable.length,
    generatedAt: new Date(),
  };

  // Pair each usable review back with its per-review labels so the caller can
  // persist them (the reviews keep their DB order through usable[]).
  const labelled = usable.map((r, i) => ({ review: r, analysis: perReview[i] }));
  return { insights, labelled };
};

// End-to-end refresh for ONE tour: load its reviews, analyse, persist the
// per-review labels AND the cached tour rollup. Reused by the batch seed and by
// the review controller (live, on each new review). Returns the insights or null.
export const refreshTourInsights = async (tourId) => {
  const tour = await Tour.findById(tourId);
  if (!tour) return null;

  const reviews = await Review.find({ tour: tourId }).sort({ createdAt: -1 });
  const result = await analyzeTourReviews(tour, reviews);

  if (!result) {
    // Not enough signal, clear any stale rollup so the UI doesn't show insights
    // built from reviews that have since been removed.
    tour.reviewInsights = { summary: "", pros: [], cons: [], aspects: [], sentiment: { positive: 0, neutral: 0, negative: 0 }, basedOn: 0, generatedAt: null };
    await tour.save();
    return null;
  }

  // Persist per-review labels (bulk, by id) so they survive for future rollups.
  const now = new Date();
  const ops = result.labelled.map(({ review, analysis }) => ({
    updateOne: {
      filter: { _id: review._id },
      update: { $set: { analysis: { sentiment: analysis.sentiment, aspects: analysis.aspects, analyzedAt: now } } },
    },
  }));
  if (ops.length) await Review.bulkWrite(ops);

  tour.reviewInsights = result.insights;
  await tour.save();
  return result.insights;
};
