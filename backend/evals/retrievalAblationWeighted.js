// Weighted-fusion sweep for the retrieval ablation. The equal-weight hybrid lost to
// vector-only because RRF blends the dense ranking with the noisier BM25 ranking 1:1
// and demotes the semantically-correct top hit. This re-runs the SAME 444 anchored
// queries but scores several fusion weightings AT ONCE (vector-only, equal, and
// vector-weighted 2:1 / 3:1 / 5:1) from ONE retrieval pass per query, so we see the
// whole curve, no cherry-picking. Vector-only is the ceiling as vec-weight->∞; the
// question is whether any light BM25 weight recovers vector's misses without demoting
// its wins. Reports whatever the data says.
//
// Caches query embeddings to disk so re-runs are free. Run: node evals/retrievalAblationWeighted.js
import dotenv from "dotenv";
import fs from "fs";
import mongoose from "mongoose";
import { embedTexts } from "../ai/embeddings.js";
import { vectorCandidates, textCandidates, detectRegion, ensureKnowledgeIndexes } from "../ai/retrieve.js";

dotenv.config();

const EVAL = process.env.EVAL_SET || "./evals/evalset.generated.json";
const QVEC_CACHE = process.env.QVEC_CACHE || "/tmp/evalset.qvecs.json";
const OVER = 20, KMAX = 10, RRF_K = 60;
const K_LIST = [1, 3, 5, 8, 10];
const EMB_BATCH = 80;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// vec-weight : txt-weight. The region-boost list (also vector-based) shares vec-weight.
const CONFIGS = [
  { name: "vector-only", wv: 1, wt: 0 },
  { name: "equal 1:1", wv: 1, wt: 1 },
  { name: "vec 2:1", wv: 2, wt: 1 },
  { name: "vec 3:1", wv: 3, wt: 1 },
  { name: "vec 5:1", wv: 5, wt: 1 },
];

// Weighted RRF over labelled lists -> ordered ids.
const fuseW = (labelled, k) => {
  const score = new Map();
  for (const { list, w } of labelled) {
    if (!w) continue;
    list.forEach((d, i) => { const id = String(d._id); score.set(id, (score.get(id) || 0) + w / (RRF_K + i + 1)); });
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([id]) => id);
};
const rankInIds = (ids, gold) => { const i = ids.indexOf(String(gold)); return i < 0 ? Infinity : i + 1; };

const run = async () => {
  const rows = JSON.parse(fs.readFileSync(EVAL, "utf8")).filter((r) => r.goldType === "chunk");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 12000 });
  const idx = await ensureKnowledgeIndexes();
  console.log("indexes queryable:", idx, "| n =", rows.length);
  if (!idx.text) { console.log("TEXT INDEX NOT QUERYABLE: aborting."); process.exit(1); }

  // Query embeddings (cached).
  let vecs;
  if (fs.existsSync(QVEC_CACHE)) {
    vecs = JSON.parse(fs.readFileSync(QVEC_CACHE, "utf8"));
    console.log(`loaded ${vecs.length} cached query embeddings`);
  } else {
    vecs = [];
    const queries = rows.map((r) => r.query);
    for (let i = 0; i < queries.length; i += EMB_BATCH) {
      vecs.push(...(await embedTexts(queries.slice(i, i + EMB_BATCH), "RETRIEVAL_QUERY")));
      if (i + EMB_BATCH < queries.length) { console.log(`  embedded ${vecs.length}/${queries.length}; pausing 62s...`); await sleep(62000); }
    }
    fs.writeFileSync(QVEC_CACHE, JSON.stringify(vecs));
  }

  const ranksByCfg = Object.fromEntries(CONFIGS.map((c) => [c.name, []]));
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], qv = vecs[i], gold = r.gold.chunkId;
    const region = detectRegion(r.query);
    const [vec, txt, boost] = await Promise.all([
      vectorCandidates(qv, { k: OVER }).catch(() => []),
      textCandidates(r.query, { k: OVER }).catch(() => []),
      region ? vectorCandidates(qv, { k: OVER, region }).catch(() => []) : Promise.resolve([]),
    ]);
    for (const c of CONFIGS) {
      const ids = c.wt === 0
        ? vec.slice(0, KMAX).map((d) => String(d._id)) // pure vector ranking
        : fuseW([{ list: vec, w: c.wv }, { list: txt, w: c.wt }, { list: boost, w: c.wv }], KMAX);
      ranksByCfg[c.name].push(rankInIds(ids, gold));
    }
    if (i % 50 === 0) process.stdout.write(`  scored ${i}/${rows.length}\n`);
  }

  const hitAt = (ranks, k) => ranks.filter((x) => x <= k).length / ranks.length;
  const mrr = (ranks) => ranks.reduce((s, x) => s + (x <= KMAX ? 1 / x : 0), 0) / ranks.length;

  console.log(`\n=== WEIGHTED-FUSION SWEEP (n=${rows.length}) ===`);
  const header = "config".padEnd(13) + K_LIST.map((k) => `hit@${k}`.padEnd(9)).join("") + "MRR@10";
  console.log(header);
  for (const c of CONFIGS) {
    const R = ranksByCfg[c.name];
    console.log(c.name.padEnd(13) + K_LIST.map((k) => `${(hitAt(R, k) * 100).toFixed(1)}%`.padEnd(9)).join("") + mrr(R).toFixed(3));
  }
  const vo = ranksByCfg["vector-only"];
  console.log(`\nvs vector-only baseline (hit@8 ${(hitAt(vo, 8) * 100).toFixed(1)}%, MRR ${mrr(vo).toFixed(3)}):`);
  for (const c of CONFIGS.slice(1)) {
    const R = ranksByCfg[c.name];
    const d8 = (hitAt(R, 8) - hitAt(vo, 8)) * 100, dm = mrr(R) - mrr(vo);
    console.log(`  ${c.name.padEnd(10)} Δhit@8 ${d8 >= 0 ? "+" : ""}${d8.toFixed(1)}pp  ΔMRR ${dm >= 0 ? "+" : ""}${dm.toFixed(3)}  ${d8 > 0 || dm > 0 ? "<- beats vector on a metric" : ""}`);
  }
  await mongoose.disconnect();
};

run().catch((e) => (console.error("Weighted ablation failed:", e), process.exit(1)));
