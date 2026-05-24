// Track B. Fills the two gaps the original corpus actually had, rather than
// padding it out (see evals/ablation.js for why this matters):
//
//   tour-info  per-journey fine print. What's included, what isn't, good to know
//              (pacing, who it suits, what to pack). One set per tour via
//              tourRefs. This is the bulk of it, and the reason metadata-filtered
//              retrieval is needed at all: "what's included on the Ladakh trip"
//              has to land on that tour's chunk, not a neighbouring one.
//   permit     Inner Line and protected-area rules for Ladakh's high valleys and
//              the North-East, scoped by region. Grounded in a factual brief so
//              the model writes house voice without inventing permit detail.
//
// Audience is domestic Indian travellers: INR, no visa talk, ILP for citizens.
// The original corpus and the concierge prompt still say inbound/visa. Separate
// job to reconcile, doing it with the review re-author.
//
// Additive and idempotent, inserts alongside the existing corpus. Skips if
// tour-info exists, --force wipes only the categories this script owns.
// node seedTourKnowledge.js [--force]
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

const OWNED_CATEGORIES = ["tour-info", "permit"];
const PACE_MS = Number(process.env.SEED_PACE_MS ?? 1500); // stay under 15 RPM

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Free Gemini tier throws transient 503/429 under back-to-back load; retry those.
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

// Domestic house voice, Indian travellers exploring their own country.
const VOICE = `You write for a luxury India travel studio whose guests are discerning INDIAN travellers exploring their own country. Quiet, editorial, slow-travel voice, unhurried, sensory, understated, never salesy. All prices are in INR. Be warm but genuinely useful and concrete. Never contradict the facts you are given, and never invent places that are not in the journey's route.`;

// Per-tour fine print ("tour-info")
const fineprintSchema = {
  type: Type.OBJECT,
  properties: {
    inclusions: { type: Type.STRING, description: "What the per-person price covers, 2-4 sentences." },
    exclusions: { type: Type.STRING, description: "What is NOT included, 2-4 sentences." },
    goodToKnow: { type: Type.STRING, description: "Fitness/pacing, who it suits, what to pack/expect, 3-5 sentences." },
  },
  required: ["inclusions", "exclusions", "goodToKnow"],
};

const tourContext = (t) => {
  const days = (t.itinerary || []).map((d) => `D${d.day}: ${d.title}`).slice(0, 12).join(" · ");
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

const genTourFineprint = async (t) => {
  const out = await generateStructured({
    system: `${VOICE}

Write the fine print for ONE private, guided journey, grounded ONLY in the facts given. Audience is a domestic Indian traveller, so prices are in INR and there is NO visa. It is fine to state plausible studio inclusions as our own (private vehicle + driver, an expert local guide, hand-picked stays, monument entries, breakfasts), but tailor them to THIS journey's region and style, never name a city not in the route.
- inclusions: what the per-person price covers, appropriate to this region (e.g. heritage palace stays in Rajasthan, a houseboat night for backwaters, tented camps in the desert/wildlife).
- exclusions: what's extra, airfare/train to the start city, lunches & dinners unless stated, personal expenses, monument camera/video fees, gratuities, travel insurance, optional experiences.
- goodToKnow: honest practicalities, the journey's pace (from its length and route), who it suits best (couples/families/first-timers, drawn from the themes), fitness/altitude where relevant (e.g. Ladakh needs acclimatisation days), what to pack and modest dress for temples, and the right season.`,
    userText: tourContext(t),
    responseSchema: fineprintSchema,
  });

  const base = { category: "tour-info", region: t.region, tourRefs: [t._id], sourceTitle: `${t.title}: good to know` };
  return [
    { ...base, title: `${t.title}: What's included`, body: (out.inclusions || "").trim() },
    { ...base, title: `${t.title}: What's not included`, body: (out.exclusions || "").trim() },
    { ...base, title: `${t.title}: Good to know`, body: (out.goodToKnow || "").trim() },
  ].filter((c) => c.body);
};

// Domestic permits ("permit")
// Accurate factual briefs the model renders into house voice WITHOUT adding new
// specifics. Keyed by region slug; only emitted if that region has tours.
const PERMIT_FACTS = {
  "leh-ladakh": `Indian nationals need an Inner Line Permit (ILP) to visit Ladakh's protected/border valleys, Nubra, Pangong Tso, Tso Moriri, Dah-Hanu and beyond. It is issued online via the LAHDC Leh portal or at the DC office in Leh, usually same day, with a small per-day environmental/Wildlife fee. Leh town and the main Leh-Kargil road do not require it. Checkpoints keep a copy, so carry several photocopies and a government photo ID. We arrange permits for guests on our Ladakh journeys.`,
  "north-east-india": `Several North-East states require an Inner Line Permit (ILP) even for Indian citizens, Arunachal Pradesh, Nagaland, Mizoram and Manipur. ILPs are issued online or at state entry points and are tied to your exact travel dates and the areas you'll visit. Meghalaya, Assam and most of the region do not require one. Because permits are date-bound, they're arranged close to departure; we handle the paperwork and timing for confirmed guests.`,
};

const permitSchema = {
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

const genRegionPermit = async (slug, tourIds) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite traveller-facing permit guidance for ONE region, grounded STRICTLY in the facts provided. Do NOT add permit names, fees, areas, or rules not in the brief, render the given facts in clear house voice. Audience: domestic Indian travellers.`,
    userText: `Region: ${regionLabel(slug)} (${slug}).\nFactual brief (do not contradict or extend):\n${PERMIT_FACTS[slug]}\n\nWrite 2 sections (heading + 2-4 sentences each): one on WHICH permit is needed and where, one on HOW we arrange it and what to carry.`,
    responseSchema: permitSchema,
  });
  return (out.sections || []).map((s) => ({
    title: `${regionLabel(slug)}: ${s.heading.trim()}`,
    body: s.body.trim(),
    category: "permit",
    region: slug,
    sourceTitle: `${regionLabel(slug)} travel permits`,
    tourRefs: tourIds,
  })).filter((c) => c.body);
};

const genPermitOverview = async (regionsWithPermits) => {
  const out = await generateStructured({
    system: `${VOICE}\n\nWrite ONE short overview clause grounded strictly in the facts. Do not invent permit specifics.`,
    userText: `A few Indian regions require an Inner Line Permit even for domestic travellers, chiefly ${regionsWithPermits.map(regionLabel).join(" and ")}. Permits are tied to your travel dates and specific areas, so they are arranged close to departure; we take care of them for confirmed guests and advise what photo ID and copies to carry.\n\nWrite ONE section (heading + 2-4 sentences) as a general "Do I need a travel permit?" overview.`,
    responseSchema: permitSchema,
  });
  const s = (out.sections || [])[0];
  if (!s?.body) return [];
  return [{ title: s.heading?.trim() || "Do I need a travel permit?", body: s.body.trim(), category: "permit", region: "", sourceTitle: "Travel permits in India", tourRefs: [] }];
};

// Run
const run = async () => {
  const force = process.argv.includes("--force");
  if (!process.env.MONGO_URI) return console.error("MONGO_URI not set. Aborting."), process.exit(1);
  if (!isAIConfigured()) return console.error("GEMINI_API_KEY not set. Aborting."), process.exit(1);

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected. Authoring tour-info + permit corpus with ${AI_MODEL}...`);

  const existing = await KnowledgeArticle.countDocuments({ category: "tour-info" });
  if (existing > 0 && !force) {
    console.log(`Already ${existing} tour-info chunks, skipping (use --force to rebuild these two categories).`);
    await mongoose.disconnect();
    return;
  }

  const tours = await Tour.find({}, "title address region price duration maxGroupSize tags bestMonths highlights itinerary").lean();
  if (!tours.length) return console.error("No tours found. Aborting."), await mongoose.disconnect(), process.exit(1);

  // Generate EVERYTHING in memory first; only touch the DB if it all succeeds, so a
  // mid-run failure never leaves a half-built layer (mirrors seedKnowledge.js).
  const chunks = [];
  console.log(`- Per-tour fine print for ${tours.length} journeys...`);
  for (const t of tours) {
    process.stdout.write(`    - ${t.title}\n`);
    chunks.push(...(await withRetry(() => genTourFineprint(t), t.title)));
    await sleep(PACE_MS);
  }

  const toursByRegion = {};
  for (const t of tours) (toursByRegion[t.region] ||= []).push(t._id);
  const permitRegions = Object.keys(PERMIT_FACTS).filter((slug) => toursByRegion[slug]?.length);
  for (const slug of permitRegions) {
    console.log(`- Permits: ${regionLabel(slug)}...`);
    chunks.push(...(await withRetry(() => genRegionPermit(slug, toursByRegion[slug]), `permit-${slug}`)));
    await sleep(PACE_MS);
  }
  if (permitRegions.length) {
    console.log("- Permits: general overview...");
    chunks.push(...(await withRetry(() => genPermitOverview(permitRegions), "permit-overview")));
  }

  const usable = chunks.filter((c) => c.title && c.body);
  console.log(`\nGenerated ${usable.length} chunks. Embedding...`);
  // The free embedding tier counts each text toward a 100/min cap, so a single
  // burst of ~131 chunks 429s (and re-sending the whole batch on retry never
  // recovers within the minute). Embed in sub-batches under the cap, pausing a
  // minute between them so the rolling quota resets. Each slice is retried alone.
  const texts = usable.map((c) => `${c.title}\n\n${c.body}`);
  const EMB_BATCH = Number(process.env.SEED_EMBED_BATCH ?? 45);
  const vectors = [];
  for (let i = 0; i < texts.length; i += EMB_BATCH) {
    const slice = texts.slice(i, i + EMB_BATCH);
    const v = await withRetry(() => embedTexts(slice), `embeddings ${i + 1}-${i + slice.length}`);
    vectors.push(...v);
    if (i + EMB_BATCH < texts.length) {
      console.log(`  embedded ${vectors.length}/${texts.length}; pausing 62s for the per-minute embed quota...`);
      await sleep(62000);
    }
  }
  usable.forEach((c, i) => (c.embedding = vectors[i]));

  // Swap in ONLY the categories this script owns, leave the existing corpus intact.
  const removed = await KnowledgeArticle.deleteMany({ category: { $in: OWNED_CATEGORIES } });
  await KnowledgeArticle.insertMany(usable);
  console.log(`Replaced ${removed.deletedCount} old -> inserted ${usable.length} new tour-info/permit chunks.`);

  console.log("Ensuring Atlas vector index is queryable...");
  const ready = await ensureVectorIndex();
  console.log(ready ? "✓ Vector index queryable." : "Vector index requested, still building.");

  const total = await KnowledgeArticle.countDocuments();
  const byCat = usable.reduce((m, c) => ((m[c.category] = (m[c.category] || 0) + 1), m), {});
  console.log(`\nDone. Added by category:`, byCat, `| corpus total now: ${total} chunks.`);
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Tour-knowledge seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
