// AI content enrichment for the tour catalogue (the DB overhaul). For each tour,
// Gemini generates rich, structured, GROUNDED content from the real fields
// (title, route/address, region, duration): a house-voice overview, controlled
// theme tags, highlights, best months, and a real day-by-day itinerary.
//
// This powers tag-aware search, grounded itinerary planning, RAG, and richer
// tour pages. Idempotent: skips tours that already have an itinerary unless you
// pass --force. Run with:  node seedTourContent.js   (or: node seedTourContent.js --force)
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Type } from "@google/genai";
import Tour from "./models/Tour.js";
import { generateStructured } from "./ai/structured.js";
import { isAIConfigured, AI_MODEL } from "./ai/client.js";

dotenv.config();

// Controlled theme vocabulary, keeps tags consistent so they're filterable.
const TAGS = [
  "heritage", "palaces", "forts", "temples", "spiritual", "wildlife", "tiger", "safari",
  "backwaters", "beach", "mountains", "trekking", "desert", "lakes", "monasteries", "tea",
  "culture", "food", "festivals", "nature", "adventure", "wellness", "honeymoon", "family",
  "luxury", "photography", "cruise", "offbeat",
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    overview: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING, enum: TAGS } },
    highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
    bestMonths: { type: Type.ARRAY, items: { type: Type.STRING, enum: MONTHS } },
    itinerary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
        },
        required: ["day", "title", "detail"],
      },
    },
  },
  required: ["overview", "tags", "highlights", "bestMonths", "itinerary"],
};

const SYSTEM = `You write content for a luxury INBOUND-to-India travel studio with a quiet, editorial, slow-travel voice (think: unhurried, sensory, understated, "Amber Fort before the buses; a long lunch under the banyans"). You will be given ONE real tour. Produce structured content GROUNDED in its real route and region.

Rules:
- overview: 2-4 sentences in that house voice. Evoke the journey; do not list logistics.
- tags: choose ONLY applicable tags from the provided enum. 4-8 of them. Lowercase.
- highlights: 4-6 short, concrete highlight phrases (e.g. "Sunrise at the Taj from Mehtab Bagh").
- bestMonths: the months this journey is genuinely at its best for its region/altitude.
- itinerary: EXACTLY one entry per day for the given duration (day 1..N). Follow the real route/cities in order, never invent cities that aren't on the route. Each detail is 1-2 evocative sentences.
- Stay truthful to the route, region and length. Do not contradict the given facts.`;

const buildUserText = (t) =>
  `Tour: "${t.title}"
Region: ${t.region}
Base city: ${t.city}
Route: ${t.address}
Duration: ${t.duration} days (produce exactly ${t.duration} itinerary entries)
Existing tagline: ${t.desc}`;

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
  console.log(`Connected. Enriching tour content with ${AI_MODEL}...`);

  const tours = await Tour.find();
  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const t of tours) {
    if (!force && Array.isArray(t.itinerary) && t.itinerary.length > 0) {
      skipped++;
      continue;
    }
    try {
      const c = await generateStructured({ system: SYSTEM, userText: buildUserText(t), responseSchema });
      t.overview = (c.overview || "").trim();
      t.tags = Array.isArray(c.tags) ? [...new Set(c.tags.map((s) => String(s).toLowerCase()))] : [];
      t.highlights = Array.isArray(c.highlights) ? c.highlights.slice(0, 6) : [];
      t.bestMonths = Array.isArray(c.bestMonths) ? c.bestMonths : [];
      t.itinerary = Array.isArray(c.itinerary)
        ? c.itinerary.map((d, i) => ({ day: d.day || i + 1, title: d.title || `Day ${i + 1}`, detail: d.detail || "" }))
        : [];
      await t.save();
      done++;
      console.log(`  ✓ ${t.title}  (${t.tags.length} tags, ${t.itinerary.length}-day itinerary)`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${t.title}: ${err.message}`);
    }
  }

  console.log(`\nDone. Enriched ${done}, skipped ${skipped} (already done), failed ${failed}, of ${tours.length} tours.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
