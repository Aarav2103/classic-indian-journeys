// S5, Review-intelligence batch runner. For each tour, runs the NLP pipeline
// (ai/reviews.js): one grounded LLM call analyses all its reviews -> per-review
// sentiment + aspect labels, deterministically rolled up into the cached
// `Tour.reviewInsights` (aspect positivity scores, sentiment split, pros/cons).
//
// Run AFTER seedReviews.js has authored a real review corpus.
// Idempotent: skips tours already analysed unless you pass --force.
// Run:  node seedReviewInsights.js [--force]
import dotenv from "dotenv";
import mongoose from "mongoose";
import Tour from "./models/Tour.js";
import Review from "./models/Review.js";
import { analyzeTourReviews, MIN_REVIEWS_FOR_INSIGHTS } from "./ai/reviews.js";
import { isAIConfigured, AI_MODEL } from "./ai/client.js";

dotenv.config();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  console.log(`Connected. Building review insights with ${AI_MODEL}...`);

  const tours = await Tour.find();
  let done = 0;
  let skipped = 0;
  let thin = 0;
  let failed = 0;

  for (const t of tours) {
    if (!force && t.reviewInsights?.generatedAt) {
      skipped++;
      continue;
    }

    const reviews = await Review.find({ tour: t._id }).sort({ createdAt: -1 });
    if (reviews.length < MIN_REVIEWS_FOR_INSIGHTS) {
      thin++;
      console.log(`  - ${t.title}: only ${reviews.length} reviews (<${MIN_REVIEWS_FOR_INSIGHTS}), skipping`);
      continue;
    }

    try {
      const result = await withRetry(() => analyzeTourReviews(t, reviews), t.title);
      if (!result) {
        thin++;
        continue;
      }

      // Persist per-review labels + the cached tour rollup.
      const now = new Date();
      const ops = result.labelled.map(({ review, analysis }) => ({
        updateOne: {
          filter: { _id: review._id },
          update: { $set: { analysis: { sentiment: analysis.sentiment, aspects: analysis.aspects, analyzedAt: now } } },
        },
      }));
      if (ops.length) await Review.bulkWrite(ops);

      t.reviewInsights = result.insights;
      await t.save();
      done++;

      const top = result.insights.aspects.slice(0, 3).map((a) => `${a.aspect} ${a.score}%`).join(", ");
      console.log(`  ✓ ${t.title}, ${result.insights.basedOn} reviews · ${result.insights.pros.length} pros / ${result.insights.cons.length} cons · ${top}`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${t.title}: ${err.message}`);
    }
  }

  console.log(`\nDone. Analysed ${done}, skipped ${skipped} (already done), thin ${thin} (too few reviews), failed ${failed}, of ${tours.length} tours.`);
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Review-insights seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
