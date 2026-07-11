// Track C, DEEP corpus expansion that takes the RAG knowledge base past ~1,000
// chunks with genuine, domestic content a luxury India studio would truly publish,
// NOT manufactured padding. Every chunk is grounded in the real catalogue (a tour's
// route/region/price, or a real place/season) so it never contradicts the tours.
//
// It adds five genuine layers, all scoped for metadata-filtered retrieval:
//   - deep per-tour sections (tour-info): where you'll stay, when to travel THIS
//     journey, who it suits, pace & fitness, how to extend/pair, getting there,
//     a typical day, food, photography, ONE set per tour, scoped via tourRefs.
//   - per-tour FAQ (faq): 6 tour-specific Q&As, scoped via tourRefs.
//   - place guides (region-guide): signature towns/places per region, scoped by region.
//   - theme guides (guide): 24 thematic guides distinct from the existing ones.
//   - month-by-month (guide): where to go / what to expect, per calendar month.
//
// ADDITIVE + idempotent: every chunk carries sourceType:"deep", inserted ALONGSIDE
// the core corpus (seedKnowledge.js), tour-info/permit (seedTourKnowledge.js) and
// sourceType:"extra" (seedKnowledgeExtra.js), never wiping them. Skips if "deep"
// chunks exist; --force wipes ONLY sourceType "deep" and regenerates.
//
// Because generation burns real Gemini quota, it CHECKPOINTS: the generated chunks
// are written to a JSON file after authoring (before embedding) and again after
// embedding, so a later network/insert failure can resume with --resume <file>
// instead of re-spending generation quota. --dry writes the embedded JSON and skips
// the DB insert (for the JSON-handoff path).
//
// Run:  node seedKnowledgeDeep.js [--force] [--dry] [--resume <embedded.json>]
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { Type } from "@google/genai";
import Tour from "./models/Tour.js";
import KnowledgeArticle from "./models/KnowledgeArticle.js";
import { generateStructured } from "./ai/structured.js";
import { embedTexts } from "./ai/embeddings.js";
import { ensureVectorIndex } from "./ai/retrieve.js";
import { isAIConfigured, AI_MODEL } from "./ai/client.js";

dotenv.config();

const SOURCE_TYPE = "deep";
const PACE_MS = Number(process.env.SEED_PACE_MS ?? 1500); // stay under 15 RPM generation
const EMB_BATCH = Number(process.env.SEED_EMBED_BATCH ?? 80); // stay under the 100/min embed cap
const CKPT_DIR = process.env.SEED_CKPT_DIR ?? ".";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Free Gemini tier throws transient 503/429/500 under back-to-back load; retry those.
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

const fmtINR = (n) => (n ? `₹${Number(n).toLocaleString("en-IN")}` : "-");
const regionLabel = (slug) => slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Domestic house voice (matches the other three seed scripts).
const VOICE = `You write for a luxury India travel studio whose guests are discerning INDIAN travellers exploring their own country, in a quiet, editorial, slow-travel voice, unhurried, sensory, understated, never salesy or breathless. All prices are in INR. These are DOMESTIC journeys within India, do NOT mention visas, international arrival/airfare, or foreign exchange at all; refer to a journey's DEPARTURE or START city, never "arrival in India". Be warm but genuinely useful and concrete; never contradict the facts you are given, and never invent places that are not in the journey's route or region.`;

// Schemas
const sectionSchema = { type: Type.OBJECT, properties: { heading: { type: Type.STRING }, body: { type: Type.STRING } }, required: ["heading", "body"] };
const sectionsSchema = { type: Type.OBJECT, properties: { sections: { type: Type.ARRAY, items: sectionSchema } }, required: ["sections"] };
const faqSchema = {
  type: Type.OBJECT,
  properties: {
    faqs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING } }, required: ["question", "answer"] } },
  },
  required: ["faqs"],
};
const placesSchema = {
  type: Type.OBJECT,
  properties: {
    places: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, blurb: { type: Type.STRING } }, required: ["name", "blurb"] } },
  },
  required: ["places"],
};

// Grounding context
const tourContext = (t) => {
  const days = (t.itinerary || []).map((d) => `D${d.day}: ${d.title}`).slice(0, 14).join(" · ");
  return [
    `Journey: ${t.title}`,
    `Route: ${t.address}`,
    `Region: ${regionLabel(t.region)} (${t.region})`,
    `Length: ${t.duration} days · Max group size: ${t.maxGroupSize} · Per-person from ${fmtINR(t.price)} (land-only)`,
    t.tags?.length ? `Themes: ${t.tags.join(", ")}` : "",
    t.bestMonths?.length ? `Best months: ${t.bestMonths.join(", ")}` : "",
    t.highlights?.length ? `Highlights: ${t.highlights.slice(0, 6).join("; ")}` : "",
    days ? `Day shape: ${days}` : "",
  ].filter(Boolean).join("\n");
};

// Layer 1: deep per-tour sections (tour-info)
const DEEP_SECTIONS = [
  ["whereYouStay", "Where you'll stay", "the character of the stays on this journey (heritage palaces, houseboats, tented camps, plantation bungalows, whatever suits THIS region and style), 2-4 sentences."],
  ["whenToTravel", "When to travel this journey", "the best window and what each season feels like on THIS route, grounded in its best months, 2-4 sentences."],
  ["whoItSuits", "Who this journey suits", "who it's ideal for, couples, families, first-timers, unhurried travellers, drawn from its themes and pace, 2-4 sentences."],
  ["paceFitness", "Pace & fitness", "honest pacing from its length and route, walking involved, and altitude/acclimatisation where relevant (e.g. Ladakh), 2-4 sentences."],
  ["extendPair", "How to extend or pair it", "natural ways to add a few days or combine with another of our journeys in a sensible direction, 2-4 sentences."],
  ["gettingThere", "Getting there & away", "how a domestic guest reaches the start city and departs the end city (flights/trains within India), 2-4 sentences. No visas or international arrival."],
  ["typicalDay", "A typical day", "the rhythm of an unhurried day on this journey, mornings, the heart of the day, evenings, 2-4 sentences."],
  ["foodDining", "Food & dining", "the food to look forward to on this route and how meals work, grounded in the region's cuisine, 2-4 sentences."],
  ["photographyHighlights", "Photography & highlights", "the moments and vistas worth the camera on this journey, grounded in its real route, 2-4 sentences."],
];

const genTourDeep = async (t) => {
  const props = {};
  for (const [key, , desc] of DEEP_SECTIONS) props[key] = { type: Type.STRING, description: desc };
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite deep, traveller-facing detail for ONE private, guided journey, grounded ONLY in the facts given. Audience is a domestic Indian traveller (INR, no visa). Tailor every section to THIS journey's region, route and style; never name a city not in the route. Each field is 2-4 concrete, useful sentences in house voice.`,
    userText: tourContext(t),
    responseSchema: { type: Type.OBJECT, properties: props, required: DEEP_SECTIONS.map(([k]) => k) },
  });
  const base = { category: "tour-info", region: t.region, tourRefs: [t._id], sourceTitle: `${t.title}: good to know`, sourceType: SOURCE_TYPE };
  return DEEP_SECTIONS.map(([key, label]) => ({ ...base, title: `${t.title}: ${label}`, body: (out[key] || "").trim() })).filter((c) => c.body);
};

// Layer 2: per-tour FAQ (faq)
const genTourFaqs = async (t) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite a concise FAQ for ONE specific journey, grounded ONLY in the facts given. Each answer is 2-4 sentences: practical and reassuring, tailored to THIS journey (its region, length, pace, price band). For health matters, advise consulting a doctor rather than giving medical instructions. It is fine to state plausible studio practice as our own.`,
    userText: `${tourContext(t)}\n\nWrite SIX question/answer pairs a traveller would genuinely ask about THIS journey, cover: what the price covers vs extras, the best time to do it, how demanding/suitable it is (families, older guests, fitness/altitude), whether it can be customised or privately chartered, single-traveller/occupancy, and what to pack for this route. Phrase each question naturally.`,
    responseSchema: faqSchema,
  });
  return (out.faqs || []).map((f) => ({
    title: f.question.trim(),
    body: f.answer.trim(),
    category: "faq",
    region: t.region,
    tourRefs: [t._id],
    sourceTitle: `${t.title}: FAQ`,
    sourceType: SOURCE_TYPE,
  })).filter((c) => c.title && c.body);
};

// Layer 3: place guides (region-guide)
const genRegionPlaces = async (r, ctxLine) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nName the signature towns/places a guest would actually visit in ONE region of India, grounded in the region and our journeys there. Real, well-known places only, never invent a place.`,
    userText: `${ctxLine}\n\nList exactly 5 signature places/towns in ${regionLabel(r)} worth a dedicated guide, each with a one-line blurb. Real places consistent with our routes here.`,
    responseSchema: placesSchema,
  });
  return (out.places || []).map((p) => p.name?.trim()).filter(Boolean).slice(0, 5);
};

const genPlaceGuide = async (r, place, tourIds, ctxLine) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite a short place guide for ONE real place in India, grounded in the region context. Use only places and seasons consistent with the facts; never invent sights.`,
    userText: `${ctxLine}\nPlace: ${place} (in ${regionLabel(r)}).\n\nWrite 3 sections (heading + 2-4 sentences each): "What awaits you", "When to go", "Good to know".`,
    responseSchema: sectionsSchema,
  });
  return (out.sections || []).map((s) => ({
    title: `${place}: ${s.heading.trim()}`,
    body: s.body.trim(),
    category: "region-guide",
    region: r,
    tourRefs: tourIds,
    sourceTitle: `${place} guide`,
    sourceType: SOURCE_TYPE,
  })).filter((c) => c.body);
};

// Layer 4: theme guides (guide)
const THEMES = [
  "Photography journeys across India", "Textiles, crafts & handloom trails", "Forts, palaces & architecture",
  "Temples & sacred India", "Luxury rail journeys", "Birding across India", "Trekking & the Himalaya",
  "Beaches & the Indian coast", "Cooking & culinary immersions", "Tea gardens & plantations",
  "Arts, music & performing traditions", "Wildlife lodges & the craft of safari", "Yoga & Ayurveda retreats",
  "Desert & dunes", "Backwaters & houseboats", "Hill stations & cool escapes", "Markets, bazaars & spice trails",
  "Responsible & low-impact travel", "Solo women travellers in India", "Celebrations, anniversaries, birthdays & proposals",
  "A first-timer's India", "Off-season & shoulder-month travel", "Rivers & lakes of India", "Heritage walks & old cities",
];

const genTheme = async (theme, regionsLine) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite a short thematic travel guide grounded ONLY in the regions and seasons we actually offer. Never invent destinations or guarantee wildlife sightings.`,
    userText: `Regions we cover: ${regionsLine}.\n\nGuide: ${theme}.\n\nWrite 3 sections (heading + 2-4 sentences each) that together help a traveller think about this across our journeys.`,
    responseSchema: sectionsSchema,
  });
  return (out.sections || []).map((s) => ({
    title: `${theme}: ${s.heading.trim()}`,
    body: s.body.trim(),
    category: "guide",
    region: "",
    tourRefs: [],
    sourceTitle: theme,
    sourceType: SOURCE_TYPE,
  })).filter((c) => c.body);
};

// Layer 5: month-by-month (guide)
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const genMonth = async (month, regionsLine) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite honest month-by-month guidance grounded ONLY in the regions and seasons we offer, including where to AVOID (peak heat, monsoon). Never invent destinations.`,
    userText: `Regions we cover: ${regionsLine}.\n\nMonth: ${month}.\n\nWrite exactly 2 sections (heading + 2-4 sentences each): "Where to go in ${month}" and "What to expect (and avoid) in ${month}".`,
    responseSchema: sectionsSchema,
  });
  return (out.sections || []).slice(0, 2).map((s) => ({
    title: `${month} in India: ${s.heading.trim()}`,
    body: s.body.trim(),
    category: "guide",
    region: "",
    tourRefs: [],
    sourceTitle: "India month by month (extended)",
    sourceType: SOURCE_TYPE,
  })).filter((c) => c.body);
};

// Authoring pass
const authorAll = async (tours, regions, toursByRegion, regionsLine) => {
  const chunks = [];

  console.log(`- Deep per-tour sections for ${tours.length} journeys...`);
  for (const t of tours) {
    process.stdout.write(`    - ${t.title}\n`);
    chunks.push(...(await withRetry(() => genTourDeep(t), `deep-${t.title}`)));
    await sleep(PACE_MS);
  }

  console.log(`- Per-tour FAQ for ${tours.length} journeys...`);
  for (const t of tours) {
    chunks.push(...(await withRetry(() => genTourFaqs(t), `faq-${t.title}`)));
    await sleep(PACE_MS);
  }

  console.log(`- Place guides across ${regions.length} regions...`);
  for (const r of regions) {
    const ctxLine = `Region: ${regionLabel(r)} (${r}). We run ${toursByRegion[r]?.length || 0} journeys here.`;
    const places = await withRetry(() => genRegionPlaces(r, ctxLine), `places-${r}`);
    await sleep(PACE_MS);
    for (const place of places) {
      process.stdout.write(`    - ${place} (${r})\n`);
      chunks.push(...(await withRetry(() => genPlaceGuide(r, place, toursByRegion[r] || [], ctxLine), `place-${place}`)));
      await sleep(PACE_MS);
    }
  }

  console.log(`- ${THEMES.length} theme guides...`);
  for (const theme of THEMES) {
    chunks.push(...(await withRetry(() => genTheme(theme, regionsLine), `theme-${theme}`)));
    await sleep(PACE_MS);
  }

  console.log(`- Month-by-month (${MONTHS.length} months)...`);
  for (const month of MONTHS) {
    chunks.push(...(await withRetry(() => genMonth(month, regionsLine), `month-${month}`)));
    await sleep(PACE_MS);
  }

  return chunks.filter((c) => c.title && c.body);
};

// Embedding pass (paced under the free per-minute cap)
const embedAll = async (usable) => {
  const texts = usable.map((c) => `${c.title}\n\n${c.body}`);
  const vectors = [];
  for (let i = 0; i < texts.length; i += EMB_BATCH) {
    const slice = texts.slice(i, i + EMB_BATCH);
    vectors.push(...(await withRetry(() => embedTexts(slice), `embeddings ${i + 1}-${i + slice.length}`)));
    if (i + EMB_BATCH < texts.length) {
      console.log(`  embedded ${vectors.length}/${texts.length}; pausing 62s for the per-minute embed quota...`);
      await sleep(62000);
    }
  }
  usable.forEach((c, i) => (c.embedding = vectors[i]));
  return usable;
};

// Run
const run = async () => {
  const force = process.argv.includes("--force");
  const dry = process.argv.includes("--dry");
  const resumeIdx = process.argv.indexOf("--resume");
  const resumeFile = resumeIdx > -1 ? process.argv[resumeIdx + 1] : null;

  if (!process.env.MONGO_URI) return console.error("MONGO_URI not set. Aborting."), process.exit(1);
  if (!isAIConfigured()) return console.error("GEMINI_API_KEY not set. Aborting."), process.exit(1);

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 12000 });
  console.log(`Connected. Deep-expanding corpus with ${AI_MODEL}...`);

  const existing = await KnowledgeArticle.countDocuments({ sourceType: SOURCE_TYPE });
  if (existing > 0 && !force && !resumeFile) {
    console.log(`Already ${existing} deep chunks, skipping (use --force to rebuild, or --resume <file>).`);
    await mongoose.disconnect();
    return;
  }

  let usable;
  if (resumeFile) {
    console.log(`Resuming from ${resumeFile} (skipping generation + any prior embedding)...`);
    usable = JSON.parse(fs.readFileSync(resumeFile, "utf8"));
  } else {
    const tours = await Tour.find({}, "title address region price duration maxGroupSize tags bestMonths highlights itinerary").lean();
    if (!tours.length) return console.error("No tours found. Aborting."), await mongoose.disconnect(), process.exit(1);

    const regions = [...new Set(tours.map((t) => t.region).filter(Boolean))].sort();
    const toursByRegion = {};
    for (const t of tours) (toursByRegion[t.region] ||= []).push(t._id);
    const regionsLine = regions.map(regionLabel).join(", ");

    console.log(`Catalogue: ${tours.length} tours across ${regions.length} regions.`);
    usable = await authorAll(tours, regions, toursByRegion, regionsLine);

    const rawPath = path.join(CKPT_DIR, "deep-chunks.raw.json");
    fs.writeFileSync(rawPath, JSON.stringify(usable, null, 0));
    console.log(`\nGenerated ${usable.length} chunks -> checkpoint ${rawPath}. Embedding...`);
  }

  if (!usable[0]?.embedding) {
    usable = await embedAll(usable);
    const embPath = path.join(CKPT_DIR, "deep-chunks.embedded.json");
    fs.writeFileSync(embPath, JSON.stringify(usable, null, 0));
    console.log(`Embedded ${usable.length} chunks -> checkpoint ${embPath}.`);
  }

  if (dry) {
    console.log("--dry: skipping DB insert. Embedded chunks are checkpointed for a later --resume insert.");
    await mongoose.disconnect();
    return;
  }

  const removed = await KnowledgeArticle.deleteMany({ sourceType: SOURCE_TYPE });
  await KnowledgeArticle.insertMany(usable);
  console.log(`Replaced ${removed.deletedCount} old -> inserted ${usable.length} new deep chunks.`);

  console.log("Ensuring Atlas vector index is queryable...");
  const ready = await ensureVectorIndex();
  console.log(ready ? "✓ Vector index queryable." : "Vector index requested, still building.");

  const total = await KnowledgeArticle.countDocuments();
  const byCat = usable.reduce((m, c) => ((m[c.category] = (m[c.category] || 0) + 1), m), {});
  console.log(`\nDone. Added deep by category:`, byCat, `| corpus total now: ${total} chunks.`);
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Deep-knowledge seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
