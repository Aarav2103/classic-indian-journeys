// One-off data fix for the "hill stations in April" contradiction.
//
// Retrieval was fine, it pulled the right April month-guide. The problem was the
// corpus: several South India season chunks flatly said avoid the April-May heat.
// True for the plains and the backwater circuit, wrong for hill stations, where
// staying cool in the hot months is the entire point. Concierge went with the
// majority and told people not to go (eval m001_0).
//
// So this makes the corpus agree with itself. Hill-station chunks now carry the
// warm-season-escape line explicitly, and the general South India season chunks
// scope their heat warning to the lowlands with a hill-station exception. All of it
// is accurate: Nilgiris ~2200m, Munnar ~1600m, Coorg ~1200m stay temperate while
// the plains hit 35-38C. Re-embeds every patched chunk.
import dotenv from "dotenv";
import mongoose from "mongoose";
import KnowledgeArticle from "../models/KnowledgeArticle.js";
import { embedTexts } from "../ai/embeddings.js";
dotenv.config();

const PATCHES = [
  {
    id: "6a48f7bb266b6e2a12e0e06a", // Hill stations & cool escapes, Mist-Covered Retreats in the South
    body: "The Western Ghats provide a verdant sanctuary for those seeking respite from the heat and humidity of the plains. In the high tea country of the Nilgiris around Ooty and Coonoor, the estates of Munnar, or the coffee plantations of Coorg, the mornings are defined by a gentle, persistent mist and long, unhurried walks through emerald hills. Because of their elevation these hill stations stay cool and temperate even through the hot months of April and May, which is exactly why they have long been the classic warm-season escape, most welcome in the very months when the southern plains and coast are best avoided.",
  },
  {
    id: "6a48f7bb266b6e2a12e0e028", // Coorg, When to go
    body: "The months between October and March offer the most temperate climate, with crisp mornings perfect for exploring the coffee estates. If you prefer the lush, rain-washed vibrancy of the monsoon, visit between July and September when the waterfalls are at their most dramatic. Even in the warmer months of April and May, Coorg's elevation keeps it noticeably cooler and greener than the plains, making it a welcome hot-season retreat, simply expect warmer afternoons than in the winter window.",
  },
  {
    id: "6a4405105955aea3de4523e7", // South India, When to go
    body: "The southern peninsula is best experienced between October and March, when the humidity recedes and the air turns crisp. These cooler months offer the perfect climate for exploring temple corridors or drifting through the backwaters under a clear, temperate sky. The one exception is the hill country, the Nilgiris, Munnar and Coorg stay cool and pleasant even through the April-May heat, making them a fine warm-season escape when the plains and coast grow hot.",
  },
  {
    id: "6a4438dca3bfd3bd7227bb05", // South India, Choosing Your Season
    body: "The ideal window for travel spans from October through March, when the air is crisp and the humidity retreats, making it perfect for exploring temple corridors or walking through mist-covered tea estates. We suggest avoiding the peak monsoon months of June through August if you prefer dry, sun-drenched days, and, for the plains and coast, steering clear of the intense heat of April and May. The hill stations are the exception: the Nilgiris, Munnar and Coorg remain cool and temperate through those summer months, and are the classic escape when the lowlands grow hot.",
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const docs = [];
  for (const p of PATCHES) {
    const doc = await KnowledgeArticle.findById(p.id);
    if (!doc) throw new Error(`chunk not found: ${p.id}`);
    console.log(`\n── ${doc.title} (${doc.category}/${doc.sourceType})`);
    console.log(`   OLD: ${doc.body.slice(0, 90)}...`);
    doc.body = p.body;
    console.log(`   NEW: ${doc.body.slice(0, 90)}...`);
    docs.push(doc);
  }

  // Re-embed (title\n\nbody, RETRIEVAL_DOCUMENT: matches the seeds' convention).
  console.log("\nRe-embedding 4 chunks...");
  let embedded = false;
  try {
    const vectors = await embedTexts(docs.map((d) => `${d.title}\n\n${d.body}`));
    if (vectors.length !== docs.length) throw new Error("embed count mismatch");
    docs.forEach((d, i) => { d.embedding = vectors[i]; });
    embedded = true;
    console.log(`  ✓ embedded (dim ${vectors[0].length})`);
  } catch (e) {
    console.log(`  ✗ embed failed (${e.message}), saving corrected BODY only; re-embed later.`);
    console.log("    (target case still fixed: e06a is already retrieved, concierge reads body text.)");
  }

  for (const d of docs) await d.save();
  console.log(`\n✓ saved ${docs.length} chunks (embedded=${embedded}).`);
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
