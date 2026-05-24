// Authors a realistic guest-review corpus.
//
// The old reviews were junk test strings ("greate", "sergrg"), so the review
// intelligence had nothing to chew on. This replaces them with grounded ones:
// distinct Indian-traveller voices, a believable rating spread (mostly warm, a
// few measured, the odd honest gripe), each tied to that journey's real route and
// highlights so the aspect analysis in ai/reviews.js has actual signal.
//
// Demo data, so invented-but-plausible voices are fine. Run seedReviewInsights.js
// afterwards to build the cached insights.
//
// Idempotent, skips if a real review corpus already exists. --force wipes all
// reviews and re-authors. node seedReviews.js [--force]
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Type } from "@google/genai";
import Tour from "./models/Tour.js";
import Review from "./models/Review.js";
import { generateStructured } from "./ai/structured.js";
import { isAIConfigured, AI_MODEL } from "./ai/client.js";

dotenv.config();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Same transient-error backoff the other AI seeds use (free tier throws 429/503).
const withRetry = async (fn, label, tries = 6) => {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.status || err?.code;
      const retryable = status === 503 || status === 429 || status === 500;
      if (!retryable || i === tries - 1) throw err;
      const wait = Math.min(32000, 2000 * 2 ** i) + Math.floor(Math.random() * 1000);
      console.log(`  ...${label}: ${status}, retrying in ${Math.round(wait / 1000)}s (attempt ${i + 2}/${tries})`);
      await sleep(wait);
    }
  }
};

const reviewsSchema = {
  type: Type.OBJECT,
  properties: {
    reviews: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          author: { type: Type.STRING, description: "Full name of the traveller." },
          rating: { type: Type.INTEGER, description: "1-5 stars." },
          text: { type: Type.STRING, description: "2-5 sentence review in the traveller's own voice." },
        },
        required: ["author", "rating", "text"],
      },
    },
  },
  required: ["reviews"],
};

const SYSTEM = `You write realistic GUEST REVIEWS for a luxury India travel studio's website. The reviewers are INDIAN travellers exploring their own country, who each took ONE specific guided journey within India. Produce reviews that read like real people, grounded in the journey's real route and character.

Rules:
- Vary the VOICE: travellers from across India, different home cities, ages and travel styles (families with children, couples, retirees, friends, the occasional solo traveller). Use plausible INDIAN full names with a NATURAL SPREAD across communities/regions (e.g. Maharashtrian, Tamil, Telugu, Kannada, Malayali, Bengali, Gujarati, Punjabi, Marwari, North-Indian), do NOT use international/Western names, and do NOT make them all from one community.
- Ground reviews in DOMESTIC travel context where it reads naturally: where they set out FROM (e.g. flew up from Mumbai, drove down from Delhi, a family from Bengaluru) and the occasion (a Diwali or summer-holiday trip, a long weekend, an anniversary, a first big family holiday with the kids). Keep it light, not every review needs it.
- Mention CONCRETE, real aspects of THIS journey: the guide/driver, specific places on the route, the food, the hotels/comfort, the pace of the days, the value, the organisation. Reference real places from the route, never invent cities the journey doesn't visit.
- Make the rating SPREAD realistic for a strong-but-not-perfect studio: mostly 4s and 5s, a couple of honest 3s, and include AT LEAST ONE measured review that raises a genuine, minor caveat (e.g. a rushed day, a long drive, summer heat, an underwhelming meal, price). Do not make every review glowing.
- Each review is 2-5 sentences. No markdown, no emoji, no star symbols in the text, no quotation marks wrapping the whole thing. First person; natural Indian English.
- Keep it truthful to the journey's region, length and season. Never contradict the facts given.`;

const buildUserText = (t, n) =>
  `Journey: "${t.title}"
Region: ${t.region}
Route: ${t.address}
Duration: ${t.duration} days
Character/overview: ${t.overview || t.desc || ""}
Signature highlights: ${(t.highlights || []).join("; ") || "-"}
Best months: ${(t.bestMonths || []).join(", ") || "-"}

Write EXACTLY ${n} distinct guest reviews for this journey, following the rating-spread rule.`;

// 6-9 reviews per tour, enough for the aspect rollup to be meaningful without
// blowing the daily quota (~42 calls total).
const countFor = (t) => 6 + (Math.abs(hash(t.title)) % 4);
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

const clampRating = (r) => {
  const n = Math.round(Number(r));
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 4;
};

const run = async () => {
  const force = process.argv.includes("--force");
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI not set. Aborting.");
    process.exit(1);
  }
  if (!isAIConfigured()) {
    console.error("GEMINI_API_KEY not set. Aborting.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected. Authoring guest reviews with ${AI_MODEL}...`);

  // Idempotency: a real corpus has lots of substantive (non-junk) review text.
  const substantive = await Review.countDocuments({
    $expr: { $gt: [{ $strLenCP: { $ifNull: ["$reviewText", ""] } }, 30] },
  });
  if (substantive > 40 && !force) {
    console.log(`Found ${substantive} substantive reviews already, skipping (use --force to re-author).`);
    await mongoose.disconnect();
    return;
  }

  const tours = await Tour.find();
  if (!tours.length) {
    console.error("No tours found, seed tours first. Aborting.");
    await mongoose.disconnect();
    process.exit(1);
  }

  // Generate everything in memory FIRST, then swap, so a mid-run failure never
  // leaves the catalogue with half its reviews replaced.
  const docs = [];
  const perTourCounts = [];
  for (const t of tours) {
    const n = countFor(t);
    const out = await withRetry(() => generateStructured({ system: SYSTEM, userText: buildUserText(t, n), responseSchema: reviewsSchema }), t.title);
    const made = (out.reviews || [])
      .filter((r) => r && String(r.text || "").trim().length > 10 && String(r.author || "").trim())
      .map((r) => ({
        tour: t._id,
        username: String(r.author).trim().slice(0, 80),
        reviewText: String(r.text).trim().slice(0, 2000),
        rating: clampRating(r.rating),
      }));
    docs.push(...made);
    perTourCounts.push({ id: t._id, title: t.title, count: made.length });
    console.log(`  ✓ ${t.title}, ${made.length} reviews`);
    await sleep(1500); // ease the free-tier 15 RPM cap across ~42 calls
  }

  console.log(`\nGenerated ${docs.length} reviews across ${tours.length} tours. Swapping in...`);
  await Review.deleteMany({});
  await Review.insertMany(docs);

  // Recompute the cached rating aggregate on every tour from the new corpus
  // (same fields the review controller maintains).
  console.log("Recomputing tour rating aggregates...");
  const agg = await Review.aggregate([
    { $group: { _id: "$tour", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const byTour = new Map(agg.map((a) => [String(a._id), a]));
  const ops = tours.map((t) => {
    const a = byTour.get(String(t._id));
    return {
      updateOne: {
        filter: { _id: t._id },
        update: { $set: { avgRating: a ? Math.round(a.avg * 10) / 10 : 0, reviewCount: a ? a.count : 0 } },
      },
    };
  });
  if (ops.length) await Tour.bulkWrite(ops);

  console.log(`\nDone. Inserted ${docs.length} reviews. Next: node seedReviewInsights.js`);
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Review seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
