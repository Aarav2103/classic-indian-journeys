// Knowledge corpus for the concierge. The 42-tour catalogue is already handled by
// structured search, so what RAG is actually for is everything search can't do:
// booking and cancellation policy, health, "best month for tigers", what's
// included, regional know-how. This authors that corpus (FAQs, policies, region
// guides, seasonal and theme guides), grounded in the real catalogue so it can't
// contradict the tours, then embeds each chunk and provisions the Atlas vector
// index. Demo project, so plausible invented policy is fine.
//
// One chunk is one KnowledgeArticle with a top-level embedding, which is what
// $vectorSearch needs to index it. Idempotent, skips if the corpus is already
// there. --force wipes and regenerates. node seedKnowledge.js [--force]
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The free Gemini tier throws transient 503 (overload) / 429 (rate) under load.
// A seed makes ~25 calls back-to-back, so retry those with exponential backoff.
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
const regionLabel = (slug) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// House voice (shared)
const VOICE = `You write for a luxury India travel studio whose guests are discerning INDIAN travellers exploring their own country, in a quiet, editorial, slow-travel voice, unhurried, sensory, understated, never salesy or breathless. All prices are in INR. These are DOMESTIC journeys within India, do NOT mention visas, international arrival/airfare, or foreign exchange at all (they are irrelevant here, so don't even raise them to say they don't apply); refer to a journey's DEPARTURE or START date, never "arrival in India". Be warm but genuinely useful and concrete; never contradict the facts you are given.`;

// Catalogue context (grounding)
const buildCatalogueContext = async () => {
  const tours = await Tour.find({}, "title address region price duration bestMonths tags").lean();
  const regions = [...new Set(tours.map((t) => t.region).filter(Boolean))].sort();

  const byRegion = {};
  for (const r of regions) {
    const rt = tours.filter((t) => t.region === r);
    const prices = rt.map((t) => t.price).filter(Boolean);
    const months = [...new Set(rt.flatMap((t) => t.bestMonths || []))];
    byRegion[r] = {
      count: rt.length,
      priceMin: prices.length ? Math.min(...prices) : null,
      priceMax: prices.length ? Math.max(...prices) : null,
      bestMonths: months,
      tours: rt.map((t) => ({
        id: String(t._id),
        title: t.title,
        route: t.address,
        duration: t.duration,
        price: t.price,
        tags: t.tags || [],
      })),
    };
  }

  const allPrices = tours.map((t) => t.price).filter(Boolean);
  return {
    regions,
    tourCount: tours.length,
    priceMin: allPrices.length ? Math.min(...allPrices) : null,
    priceMax: allPrices.length ? Math.max(...allPrices) : null,
    byRegion,
  };
};

const globalContextText = (ctx) => {
  const lines = [
    `Catalogue: ${ctx.tourCount} private, guided journeys across India.`,
    `Per-person price band (land-only, indicative): ${fmtINR(ctx.priceMin)}-${fmtINR(ctx.priceMax)}.`,
    `Regions we cover (slug, count, best months):`,
  ];
  for (const r of ctx.regions) {
    const b = ctx.byRegion[r];
    lines.push(`  - ${r} (${regionLabel(r)}), ${b.count} journeys, ${fmtINR(b.priceMin)}-${fmtINR(b.priceMax)}, best: ${b.bestMonths.join(", ") || "year-round"}`);
  }
  return lines.join("\n");
};

const regionContextText = (ctx, r) => {
  const b = ctx.byRegion[r];
  const lines = [
    `Region: ${regionLabel(r)} (slug: ${r}).`,
    `We run ${b.count} journeys here; per-person price band ${fmtINR(b.priceMin)}-${fmtINR(b.priceMax)}.`,
    `Best months for this region (from our catalogue): ${b.bestMonths.join(", ") || "year-round"}.`,
    `Our journeys here (title, route, days):`,
    ...b.tours.map((t) => `  - ${t.title}, ${t.route}, ${t.duration} days`),
  ];
  return lines.join("\n");
};

// Schemas
const faqSchema = {
  type: Type.OBJECT,
  properties: {
    faqs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { question: { type: Type.STRING }, answer: { type: Type.STRING } },
        required: ["question", "answer"],
      },
    },
  },
  required: ["faqs"],
};

const articleSchema = {
  type: Type.OBJECT,
  properties: {
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { heading: { type: Type.STRING }, body: { type: Type.STRING } },
        required: ["heading", "body"],
      },
    },
  },
  required: ["sections"],
};

// Generators (each returns an array of chunk objects)
const FAQ_TOPICS = [
  "How do I book a journey, and how far ahead should I plan?",
  "What does the per-person price include, and what is excluded?",
  "How much deposit is required, and when is the balance due?",
  "What is your cancellation and refund policy in brief?",
  "Can I customise, extend, or privately charter an itinerary?",
  "Do you run private departures, and what group sizes do you cater to?",
  "What identification or travel permits do I need to journey within India?",
  "What health precautions should I take, altitude, heat, monsoon, and food on the road?",
  "Is the tap water safe, and how do you handle food safety?",
  "When is the best time of year to visit India?",
  "How will I travel between destinations on a journey?",
  "Is India safe for solo travellers and for women?",
  "What currency is used, how should I carry money, and is tipping expected?",
  "Will I have mobile and internet connectivity during my trip?",
  "Is travel insurance required, and what should it cover?",
  "What should I pack for a journey across India?",
  "Are your journeys suitable for families with children and for older travellers?",
];

const genFaqs = async (ctx) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite a concise FAQ. Each answer is 2-4 sentences: practical and reassuring, in the house voice but clear (a traveller needs a real answer, not only atmosphere). Ground anything factual in the catalogue facts provided, use the real price band and regions; never invent destinations we don't offer. Prices in INR. It is fine to state plausible studio policy (deposits, timelines) as our own.`,
    userText: `Catalogue facts:\n${globalContextText(ctx)}\n\nWrite ONE question/answer pair for EACH of these topics, in this order, rephrasing the question naturally as a traveller would ask it:\n${FAQ_TOPICS.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
    responseSchema: faqSchema,
  });
  return (out.faqs || []).map((f) => ({
    title: f.question.trim(),
    body: f.answer.trim(),
    category: "faq",
    sourceTitle: "Frequently asked questions",
    region: "",
    tourRefs: [],
  }));
};

const genPolicies = async (ctx) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite the studio's traveller-facing booking policies as clear, self-contained clauses. Each clause is a heading plus 2-4 sentences a traveller can rely on. Be specific with numbers (deposit %, day thresholds, refund tiers), invented but plausible is fine for this studio. Prices in INR.`,
    userText: `Catalogue facts:\n${globalContextText(ctx)}\n\nWrite the following policy clauses, each as one section (heading + body):\n1. Booking & deposit (what confirms a booking; deposit %; balance due date)\n2. Cancellation & refunds (a clear tiered schedule by days before departure)\n3. Amendments & rescheduling (changing dates or itinerary after booking)\n4. What's included and excluded (land arrangements, guiding, transfers; flights or trains to the start city, insurance, tips, incidentals, do NOT mention visas or international airfare at all)\n5. Travel insurance (our requirement and recommended cover)\n6. Force majeure & itinerary changes (weather, closures, safety)`,
    responseSchema: articleSchema,
  });
  return (out.sections || []).map((s) => ({
    title: s.heading.trim(),
    body: s.body.trim(),
    category: "policy",
    sourceTitle: "Booking policies",
    region: "",
    tourRefs: [],
  }));
};

const genRegionGuide = async (ctx, r) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite a destination guide for ONE region of India, grounded in the journeys we actually run there. Use ONLY places and seasons consistent with the facts given, never invent cities or regions. Reference our real journeys by name where natural.`,
    userText: `${regionContextText(ctx, r)}\n\nWrite these four sections (heading + 2-4 sentences each):\n1. "When to go", grounded in the best months above.\n2. "What awaits you", the signature experiences and texture of this region.\n3. "Getting around", how travellers move through this region on our journeys.\n4. "Our journeys in ${regionLabel(r)}", briefly orient the traveller to the kinds of trips we offer here, referencing real ones by name.`,
    responseSchema: articleSchema,
  });
  const tourRefs = ctx.byRegion[r].tours.map((t) => t.id);
  return (out.sections || []).map((s) => ({
    title: `${regionLabel(r)}: ${s.heading.trim()}`,
    body: s.body.trim(),
    category: "region-guide",
    sourceTitle: `${regionLabel(r)} destination guide`,
    region: r,
    tourRefs,
  }));
};

const THEMES = [
  { key: "month-by-month", title: "India month by month", brief: "A month-by-month guide to when to travel where in India, grounded in the regions and best months we offer. Cover the cool season, shoulder months, and the monsoon honestly." },
  { key: "tigers-wildlife", title: "Best months for tigers & wildlife", brief: "When and where to see tigers and wildlife in India, grounded in our wildlife/safari journeys and their regions and best months. Be honest that big-cat sightings are never guaranteed." },
  { key: "honeymoon", title: "Honeymoons in India", brief: "How to plan a honeymoon in India: the most romantic regions, seasons and pairings: grounded in our journeys and price bands." },
  { key: "family", title: "Travelling with family in India", brief: "Planning a family trip to India: pacing, regions that suit children, and practicalities: grounded in our journeys." },
];

const genThemeGuide = async (ctx, theme) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite a short thematic travel guide, grounded ONLY in the regions, seasons and journeys we actually offer. Never invent destinations or guarantee wildlife sightings. Prices in INR.`,
    userText: `Catalogue facts:\n${globalContextText(ctx)}\n\nGuide topic: ${theme.title}.\n${theme.brief}\n\nWrite 3 sections (heading + 2-4 sentences each) that together answer how a traveller should think about this.`,
    responseSchema: articleSchema,
  });
  return (out.sections || []).map((s) => ({
    title: `${theme.title}: ${s.heading.trim()}`,
    body: s.body.trim(),
    category: "guide",
    sourceTitle: theme.title,
    region: "",
    tourRefs: [],
  }));
};

// Run
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
  console.log(`Connected. Authoring knowledge corpus with ${AI_MODEL}...`);

  // This script OWNS the CORE faq/policy/guide/region-guide chunks. tour-info/permit
  // belong to seedTourKnowledge.js, and sourceType:"extra" chunks (festivals,
  // etiquette, extra themes/FAQs) belong to seedKnowledgeExtra.js, never touch
  // either here, so --force can't wipe them.
  const OWNED = ["faq", "policy", "guide", "region-guide"];
  const ownScope = { category: { $in: OWNED }, sourceType: { $ne: "extra" } };
  const existing = await KnowledgeArticle.countDocuments(ownScope);
  if (existing > 0 && !force) {
    console.log(`Corpus already has ${existing} owned chunks, skipping generation (use --force to rebuild).`);
    console.log("Ensuring Atlas vector index...");
    const ready = await ensureVectorIndex();
    console.log(ready ? "Vector index is queryable." : "Vector index requested (still building).");
    await mongoose.disconnect();
    return;
  }

  const ctx = await buildCatalogueContext();
  if (!ctx.tourCount) {
    console.error("No tours found, seed/enrich tours first (seedTourContent.js). Aborting.");
    await mongoose.disconnect();
    process.exit(1);
  }

  // Generate everything in memory FIRST; only touch the DB if it all succeeds, so
  // a mid-run failure never leaves a half-built corpus.
  const chunks = [];
  console.log("- FAQs...");
  chunks.push(...(await withRetry(() => genFaqs(ctx), "FAQs")));
  console.log("- Policies...");
  chunks.push(...(await withRetry(() => genPolicies(ctx), "Policies")));
  for (const r of ctx.regions) {
    console.log(`- Region guide: ${regionLabel(r)}...`);
    chunks.push(...(await withRetry(() => genRegionGuide(ctx, r), regionLabel(r))));
  }
  for (const theme of THEMES) {
    console.log(`- Theme guide: ${theme.title}...`);
    chunks.push(...(await withRetry(() => genThemeGuide(ctx, theme), theme.title)));
  }

  const usable = chunks.filter((c) => c.title && c.body);
  console.log(`\nGenerated ${usable.length} chunks. Embedding...`);
  const vectors = await withRetry(() => embedTexts(usable.map((c) => `${c.title}\n\n${c.body}`)), "embeddings");
  usable.forEach((c, i) => (c.embedding = vectors[i]));

  // Swap in the new corpus atomically-ish: wipe ONLY our core categories, then
  // insert (leaves tour-info/permit AND sourceType:"extra" chunks intact).
  await KnowledgeArticle.deleteMany(ownScope);
  await KnowledgeArticle.insertMany(usable);
  console.log(`Inserted ${usable.length} knowledge chunks.`);

  console.log("Provisioning Atlas vector index...");
  const ready = await ensureVectorIndex();
  console.log(ready ? "✓ Vector index is queryable." : "Vector index requested, still building (retrieval works once it's READY).");

  const byCat = usable.reduce((m, c) => ((m[c.category] = (m[c.category] || 0) + 1), m), {});
  console.log(`\nDone. Corpus by category:`, byCat);
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Knowledge seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
