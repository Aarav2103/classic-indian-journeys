// Retrieval ablation: HYBRID (vector + BM25 + RRF + region boost) vs VECTOR-ONLY,
// over the anchored eval set (evals/evalset.generated.json). Each anchored query's
// gold is the exact source chunk it was generated from, so this is pure deterministic
// retrieval math, NO LLM judge. Reports hit@k / MRR for each arm and the delta =
// the "hybrid improved recall by X% over vector-only" number.
//
// One embedding per query (shared across both arms). Embeds are paced under the
// free-tier 100-texts/min cap. Run: node evals/retrievalAblation.js
import dotenv from "dotenv";
import fs from "fs";
import mongoose from "mongoose";
import { embedTexts } from "../ai/embeddings.js";
import { vectorCandidates, retrieveFromVector, ensureKnowledgeIndexes } from "../ai/retrieve.js";

dotenv.config();

const EVAL = process.env.EVAL_SET || "./evals/evalset.generated.json";
const KMAX = 10;
const K_LIST = [1, 3, 5, 8, 10];
const EMB_BATCH = 80;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
  const rows = JSON.parse(fs.readFileSync(EVAL, "utf8")).filter((r) => r.goldType === "chunk");
  console.log(`Ablation over ${rows.length} anchored queries.`);

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 12000 });
  const idx = await ensureKnowledgeIndexes();
  console.log("indexes queryable:", idx);
  if (!idx.text) console.log("⚠️  TEXT INDEX NOT QUERYABLE: hybrid degrades to vector-only; ablation would be invalid. Aborting.") || process.exit(1);

  // Embed every query once (RETRIEVAL_QUERY), paced under the per-minute cap.
  const queries = rows.map((r) => r.query);
  const vecs = [];
  for (let i = 0; i < queries.length; i += EMB_BATCH) {
    vecs.push(...(await embedTexts(queries.slice(i, i + EMB_BATCH), "RETRIEVAL_QUERY")));
    if (i + EMB_BATCH < queries.length) {
      console.log(`  embedded ${vecs.length}/${queries.length}; pausing 62s (embed cap)...`);
      await sleep(62000);
    }
  }

  const rankOf = (res, goldId) => {
    const i = res.findIndex((d) => String(d._id) === String(goldId));
    return i < 0 ? Infinity : i + 1;
  };

  const vRanks = [], hRanks = [];
  const perIntent = {};
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], qv = vecs[i], gold = r.gold.chunkId;
    const [vres, hres] = await Promise.all([
      vectorCandidates(qv, { k: KMAX }).catch(() => []),
      retrieveFromVector(qv, r.query, { k: KMAX }).catch(() => []),
    ]);
    const vr = rankOf(vres, gold), hr = rankOf(hres, gold);
    vRanks.push(vr); hRanks.push(hr);
    const pi = (perIntent[r.intent] ||= { v: 0, h: 0, n: 0 });
    pi.n++; if (vr <= 8) pi.v++; if (hr <= 8) pi.h++;
    if (i % 50 === 0) process.stdout.write(`  scored ${i}/${rows.length}\n`);
  }

  const hitAt = (ranks, k) => ranks.filter((x) => x <= k).length / ranks.length;
  const mrr = (ranks) => ranks.reduce((s, x) => s + (x <= KMAX ? 1 / x : 0), 0) / ranks.length;

  console.log(`\n=== RETRIEVAL ABLATION (n=${rows.length}) ===`);
  console.log("metric     vector-only    hybrid      Δ abs     Δ rel");
  for (const k of K_LIST) {
    const v = hitAt(vRanks, k), h = hitAt(hRanks, k);
    const rel = v > 0 ? ((h - v) / v) * 100 : 0;
    console.log(`hit@${k}`.padEnd(10) + ` ${(v * 100).toFixed(1)}%`.padEnd(14) + `${(h * 100).toFixed(1)}%`.padEnd(11) + `+${((h - v) * 100).toFixed(1)}pp`.padEnd(10) + `+${rel.toFixed(1)}%`);
  }
  const vm = mrr(vRanks), hm = mrr(hRanks);
  console.log(`MRR@${KMAX}`.padEnd(10) + ` ${vm.toFixed(3)}`.padEnd(14) + `${hm.toFixed(3)}`.padEnd(11) + `+${(hm - vm).toFixed(3)}`.padEnd(10) + `+${(((hm - vm) / vm) * 100).toFixed(1)}%`);

  console.log("\nper-intent hit@8 (vector -> hybrid):");
  for (const [intent, s] of Object.entries(perIntent).sort())
    console.log(`  ${intent.padEnd(18)} ${(s.v / s.n * 100).toFixed(0)}% -> ${(s.h / s.n * 100).toFixed(0)}%   (n=${s.n})`);

  let hOnly = 0, vOnly = 0;
  vRanks.forEach((vr, i) => { const hr = hRanks[i]; if (hr <= 8 && vr > 8) hOnly++; if (vr <= 8 && hr > 8) vOnly++; });
  console.log(`\nAt k=8: hybrid recovered ${hOnly} gold chunks vector-only missed; hybrid lost ${vOnly}.`);

  // The artifact carries the hit@k curve and the per-intent breakdown, which is what
  // gets compared across runs. MRR is a single roll-up of the same ranks, reported in
  // the console output above and in evals/README.md.
  fs.writeFileSync(EVAL.replace(/\.json$/, "") + ".ablation.json", JSON.stringify({
    n: rows.length, k: K_LIST,
    vector: Object.fromEntries(K_LIST.map((k) => [`hit@${k}`, hitAt(vRanks, k)])),
    hybrid: Object.fromEntries(K_LIST.map((k) => [`hit@${k}`, hitAt(hRanks, k)])),
    perIntent,
  }, null, 2));
  await mongoose.disconnect();
};

run().catch((e) => (console.error("Ablation failed:", e), process.exit(1)));
