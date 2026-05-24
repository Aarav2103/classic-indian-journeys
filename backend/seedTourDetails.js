// One-off, idempotent enrichment for tour data used by AI search (S1) and the
// rest of the AI roadmap. The original seed left price/duration/maxGroupSize/
// avgRating/distance unset (0/undefined), which makes numeric search filters
// ("under ₹50k", "10 days") meaningless. This fills realistic values:
//   - duration  -> parsed from the human "X Nights / Y Days" text already in desc
//   - price     -> derived from duration × a region day-rate, deterministic per _id
//   - others    -> plausible, deterministic per _id
// Only fields that are currently empty are written, so admin edits are preserved
// and re-running is a no-op. Run with:  node seedTourDetails.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import Tour from "./models/Tour.js";

dotenv.config();

// Deterministic per-document PRNG (LCG seeded from the _id) so values are stable
// across runs, no churn, idempotent.
const makeRng = (seedStr) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    return h / 0xffffffff;
  };
};

const parseDuration = (desc = "") => {
  const days = desc.match(/(\d+)\s*Days/i);
  if (days) return parseInt(days[1], 10);
  const nights = desc.match(/(\d+)\s*Nights/i);
  if (nights) return parseInt(nights[1], 10) + 1;
  return null;
};

// Approx luxury inbound day-rate (INR) by region.
const REGION_DAY_RATE = {
  "leh-ladakh": 16000,
  rajasthan: 14000,
  "north-east-india": 13000,
  "north-india": 11000,
  "south-india": 10500,
  "west-india": 10500,
  "central-india": 9500,
  "east-india": 9000,
};

const GROUP_SIZES = [2, 4, 6, 8, 10, 12, 16];
const roundTo = (n, step) => Math.round(n / step) * step;

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set. Aborting.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("Connected. Enriching tours...");

  const tours = await Tour.find();
  let updated = 0;

  for (const t of tours) {
    const rng = makeRng(String(t._id));
    const set = {};

    const duration = t.duration > 0 ? t.duration : parseDuration(t.desc) || 7;
    if (!(t.duration > 0)) set.duration = duration;

    if (!(t.price > 0)) {
      const rate = REGION_DAY_RATE[t.region] ?? 10000;
      const factor = 0.9 + rng() * 0.45; // 0.90-1.35
      set.price = Math.max(25000, roundTo(duration * rate * factor, 1000));
    }

    if (!(t.maxGroupSize > 0)) {
      set.maxGroupSize = GROUP_SIZES[Math.floor(rng() * GROUP_SIZES.length)];
    }

    if (!(t.avgRating > 0)) {
      set.avgRating = Math.round((4.3 + rng() * 0.7) * 10) / 10; // 4.3-5.0
      if (!(t.reviewCount > 0)) set.reviewCount = 3 + Math.floor(rng() * 45);
    }

    if (!(t.distance > 0)) {
      set.distance = 150 + Math.floor(rng() * 1200);
    }

    if (Object.keys(set).length) {
      await Tour.updateOne({ _id: t._id }, { $set: set });
      updated++;
    }
  }

  console.log(`Done. Updated ${updated}/${tours.length} tours.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
