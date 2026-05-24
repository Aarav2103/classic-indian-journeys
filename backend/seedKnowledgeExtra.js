// Track B extension. Deepens the knowledge base with content the studio would
// actually publish: per-region festival and seasonal timing, etiquette and local
// customs, a few more theme guides, extra practical FAQs. Real breadth rather than
// look-alike padding, though it does conveniently also grow the stuffing cost and
// give the ablation's scoped-correctness judge more region-scoped entities to
// test against.
//
// Additive and idempotent. Everything carries sourceType "extra" and goes in
// alongside the core corpus rather than over it. Skips if extra chunks exist,
// --force wipes only sourceType extra. node seedKnowledgeExtra.js [--force]
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Type } from "@google/genai";
import Tour from "./models/Tour.js";
import KnowledgeArticle from "./models/KnowledgeArticle.js";
import { generateStructured } from "./ai/structured.js";
import { embedTexts } from "./ai/embeddings.js";
import { ensureVectorIndex } from "./ai/retrieve.js";
import { isAIConfigured, AI_MODEL } from "./ai/client.js";

dotenv.config();

const PACE_MS = Number(process.env.SEED_PACE_MS ?? 1500);
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

const fmtINR = (n) => (n ? `₹${Number(n).toLocaleString("en-IN")}` : "-");
const regionLabel = (slug) => slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Domestic house voice (matches seedKnowledge.js / seedTourKnowledge.js).
const VOICE = `You write for a luxury India travel studio whose guests are discerning INDIAN travellers exploring their own country, in a quiet, editorial, slow-travel voice, unhurried, sensory, understated, never salesy. All prices are in INR. These are DOMESTIC journeys within India, do NOT mention visas, international arrival/airfare, or foreign exchange. Be warm but genuinely useful and concrete; never contradict the facts you are given.`;

const sectionSchema = {
  type: Type.OBJECT,
  properties: { heading: { type: Type.STRING }, body: { type: Type.STRING } },
  required: ["heading", "body"],
};
const articleSchema = { type: Type.OBJECT, properties: { sections: { type: Type.ARRAY, items: sectionSchema } }, required: ["sections"] };
const faqSchema = {
  type: Type.OBJECT,
  properties: {
    faqs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING } }, required: ["question", "answer"] } },
  },
  required: ["faqs"],
};

// Catalogue context (grounding)
const buildContext = async () => {
  const tours = await Tour.find({}, "title region price bestMonths tags").lean();
  const regions = [...new Set(tours.map((t) => t.region).filter(Boolean))].sort();
  const byRegion = {};
  for (const r of regions) {
    const rt = tours.filter((t) => t.region === r);
    byRegion[r] = {
      ids: rt.map((t) => t._id),
      bestMonths: [...new Set(rt.flatMap((t) => t.bestMonths || []))],
      tags: [...new Set(rt.flatMap((t) => t.tags || []))],
    };
  }
  return { regions, byRegion, count: tours.length };
};

const regionCtxText = (ctx, r) =>
  `Region: ${regionLabel(r)} (${r}). Best months across our journeys here: ${ctx.byRegion[r].bestMonths.join(", ") || "year-round"}. Themes we run here: ${ctx.byRegion[r].tags.join(", ") || "-"}.`;

// Generators
const genRegionFestivals = async (ctx, r) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite a short "festivals & when to come" note for ONE region, the festivals, fairs and seasonal moments worth timing a journey around, plus the months to favour or avoid (monsoon, peak heat). Ground it ONLY in the region and seasons given; name real, well-known festivals appropriate to this region; never invent events or promise specific dates.`,
    userText: `${regionCtxText(ctx, r)}\n\nWrite 2 sections (heading + 2-4 sentences): one on the signature festivals/fairs of ${regionLabel(r)}, one on the best months to come and what to avoid.`,
    responseSchema: articleSchema,
  });
  return (out.sections || []).map((s) => ({
    title: `${regionLabel(r)}: ${s.heading.trim()}`,
    body: s.body.trim(),
    category: "region-guide",
    region: r,
    sourceTitle: `${regionLabel(r)} destination guide`,
    sourceType: "extra",
    tourRefs: ctx.byRegion[r].ids,
  })).filter((c) => c.body);
};

const genRegionEtiquette = async (ctx, r) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite a short "etiquette & local customs" note for ONE region, temple/monastery dress and conduct, photography manners, and any local norms (e.g. dry states where alcohol is restricted, removing shoes, modest dress). Ground it in the real region; be practical and respectful; never invent rules.`,
    userText: `${regionCtxText(ctx, r)}\n\nWrite 1 section (heading "Etiquette & local customs" + 3-5 sentences) of genuinely useful conduct guidance for a traveller in ${regionLabel(r)}.`,
    responseSchema: articleSchema,
  });
  return (out.sections || []).map((s) => ({
    title: `${regionLabel(r)}: Etiquette & local customs`,
    body: s.body.trim(),
    category: "region-guide",
    region: r,
    sourceTitle: `${regionLabel(r)} destination guide`,
    sourceType: "extra",
    tourRefs: ctx.byRegion[r].ids,
  })).filter((c) => c.body);
};

const THEMES = [
  { title: "Food trails of India", brief: "How to eat your way across India on our journeys: regional cuisines, thalis, street food done safely, and the dishes worth travelling for, grounded in the regions we cover." },
  { title: "Multi-generational & family journeys", brief: "Planning a trip for three generations or a big family: pace, regions that suit grandparents and children alike, and how we adapt, grounded in our journeys." },
  { title: "Wellness & slow journeys", brief: "Unhurried, restorative travel in India: yoga, Ayurveda, quiet backwaters and mountains: grounded in the regions and seasons we offer." },
  { title: "Travelling in the monsoon", brief: "Where in India is wonderful during the monsoon and where to avoid: honest seasonal guidance grounded in our regions and best months." },
];

const genTheme = async (ctx, theme) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite a short thematic travel guide grounded ONLY in the regions, seasons and themes we actually offer. Never invent destinations or guarantee wildlife sightings.`,
    userText: `Regions we cover: ${ctx.regions.map(regionLabel).join(", ")}.\n\nGuide: ${theme.title}.\n${theme.brief}\n\nWrite 3 sections (heading + 2-4 sentences each).`,
    responseSchema: articleSchema,
  });
  return (out.sections || []).map((s) => ({
    title: `${theme.title}: ${s.heading.trim()}`,
    body: s.body.trim(),
    category: "guide",
    region: "",
    sourceTitle: theme.title,
    sourceType: "extra",
    tourRefs: [],
  })).filter((c) => c.body);
};

const EXTRA_FAQ_TOPICS = [
  "How do you handle dietary needs, vegetarian, Jain, vegan or allergies, on a journey?",
  "Several of your journeys go to high altitude (Ladakh). How do you handle acclimatisation and altitude sickness?",
  "Are your journeys suitable for travellers with limited mobility or older guests?",
  "Is India comfortable and safe for women travelling solo or in small groups?",
  "How reliable is mobile and internet connectivity in remote regions on your journeys?",
  "Can you arrange special occasions, an anniversary, a birthday, a proposal, on a journey?",
];

const genExtraFaqs = async () => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite a concise FAQ for domestic Indian travellers. Each answer is 2-4 sentences: practical and reassuring, in the house voice but clear. For any health matter, advise consulting a doctor rather than giving medical instructions. It is fine to state plausible studio practice as our own.`,
    userText: `Write ONE question/answer pair for EACH topic, rephrasing the question naturally:\n${EXTRA_FAQ_TOPICS.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
    responseSchema: faqSchema,
  });
  return (out.faqs || []).map((f) => ({
    title: f.question.trim(),
    body: f.answer.trim(),
    category: "faq",
    region: "",
    sourceTitle: "Frequently asked questions",
    sourceType: "extra",
    tourRefs: [],
  })).filter((c) => c.body);
};

// Run
const run = async () => {
  const force = process.argv.includes("--force");
  if (!process.env.MONGO_URI) return console.error("MONGO_URI not set. Aborting."), process.exit(1);
  if (!isAIConfigured()) return console.error("GEMINI_API_KEY not set. Aborting."), process.exit(1);

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected. Authoring EXTRA knowledge with ${AI_MODEL}...`);

  const existing = await KnowledgeArticle.countDocuments({ sourceType: "extra" });
  if (existing > 0 && !force) {
    console.log(`Already ${existing} extra chunks, skipping (use --force to rebuild).`);
    await mongoose.disconnect();
    return;
  }

  const ctx = await buildContext();
  if (!ctx.count) return console.error("No tours found. Aborting."), await mongoose.disconnect(), process.exit(1);

  const chunks = [];
  for (const r of ctx.regions) {
    console.log(`- Festivals: ${regionLabel(r)}...`);
    chunks.push(...(await withRetry(() => genRegionFestivals(ctx, r), `festivals-${r}`)));
    await sleep(PACE_MS);
    console.log(`- Etiquette: ${regionLabel(r)}...`);
    chunks.push(...(await withRetry(() => genRegionEtiquette(ctx, r), `etiquette-${r}`)));
    await sleep(PACE_MS);
  }
  for (const theme of THEMES) {
    console.log(`- Theme: ${theme.title}...`);
    chunks.push(...(await withRetry(() => genTheme(ctx, theme), theme.title)));
    await sleep(PACE_MS);
  }
  console.log("- Extra FAQs...");
  chunks.push(...(await withRetry(() => genExtraFaqs(), "extra-faqs")));

  const usable = chunks.filter((c) => c.title && c.body);
  console.log(`\nGenerated ${usable.length} extra chunks. Embedding...`);
  const texts = usable.map((c) => `${c.title}\n\n${c.body}`);
  const EMB_BATCH = Number(process.env.SEED_EMBED_BATCH ?? 45); // stay under the 100/min embed cap
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

  const removed = await KnowledgeArticle.deleteMany({ sourceType: "extra" });
  await KnowledgeArticle.insertMany(usable);
  console.log(`Replaced ${removed.deletedCount} old -> inserted ${usable.length} new extra chunks.`);

  console.log("Ensuring Atlas vector index is queryable...");
  const ready = await ensureVectorIndex();
  console.log(ready ? "✓ Vector index queryable." : "Vector index requested, still building.");

  const total = await KnowledgeArticle.countDocuments();
  const byCat = usable.reduce((m, c) => ((m[c.category] = (m[c.category] || 0) + 1), m), {});
  console.log(`\nDone. Added by category:`, byCat, `| corpus total now: ${total} chunks.`);
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Extra-knowledge seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
