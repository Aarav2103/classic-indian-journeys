// AI eval harness, runs the product's AI features against labeled fixtures and
// prints a scorecard with pass/fail thresholds (non-zero exit on regression, so
// it's CI-able). Two grading techniques on purpose:
//   - deterministic: structured-output field match (search), classification
//                      accuracy (router), retrieval hit@k / MRR (RAG recall)
//   - LLM-as-judge: concierge answer faithfulness (judge.js)
//
// Live: it calls Gemini + Atlas, so it needs MONGO_URI + GEMINI_API_KEY and the
// vector index (seedKnowledge.js). Run from backend/:  npm run eval
//   filter tasks:  npm run eval -- --only=search,router
import dotenv from "dotenv";
import mongoose from "mongoose";
import Tour from "../models/Tour.js";
import { parseSearchIntent } from "../ai/search.js";
import { classifyIntent } from "../ai/router.js";
import { retrieveKnowledge } from "../ai/retrieve.js";
import { askConcierge } from "../ai/concierge.js";
import { isAIConfigured, AI_MODEL } from "../ai/client.js";
import { judgeGrounding } from "./judge.js";
import { runAblation } from "./ablation.js";
import { buildEvidence, assertGoldResolves } from "./gold.js";
import { searchCases, routerCases, retrievalCases, conciergeCases, ablationCases } from "./datasets.js";
import { scoreIntent, mean, pct, firstMatchRank, retrievalPredicate } from "./scorers.js";

dotenv.config();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Free tier is 15 RPM. The router silently falls back to "find" on a rate-limited
// call (ai/router.js), so a too-fast harness would MEASURE that degradation, not
// the model. Pace ~1 call / 4s to stay under the cap; override for a higher-quota
// model with EVAL_PACE_MS=0.
const PACE_MS = Number(process.env.EVAL_PACE_MS ?? 4000);

const withRetry = async (fn, label, tries = 6) => {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.status || err?.code;
      const retryable = status === 503 || status === 429 || status === 500;
      if (!retryable || i === tries - 1) throw err;
      const wait = Math.min(32000, 2000 * 2 ** i) + Math.floor(Math.random() * 1000);
      console.log(`    ...${label}: ${status}, retrying in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
    }
  }
};

const ICON = (ok) => (ok ? "✓" : "✗");
const bar = "─".repeat(64);

// Tasks

const runSearch = async () => {
  console.log(`\n${bar}\nS1 · NL->Mongo search  (structured-output field match)\n${bar}`);
  let scalarOk = 0, scalarTotal = 0;
  const passes = [], recalls = [];
  for (const c of searchCases) {
    const intent = await withRetry(() => parseSearchIntent(c.q), "search");
    const s = scoreIntent(intent, c.expect);
    scalarOk += s.fields.filter((f) => f.ok).length;
    scalarTotal += s.fields.length;
    if (s.keywords) recalls.push(s.keywords.recall);
    passes.push(s.pass);
    const bad = s.fields.filter((f) => !f.ok).map((f) => `${f.field}=${JSON.stringify(f.pred)}≠${JSON.stringify(f.exp)}`);
    const kw = s.keywords ? ` kw-recall ${pct(s.keywords.recall)}` : "";
    console.log(`  ${ICON(s.pass)} "${c.q}"${kw}${bad.length ? `  [${bad.join(", ")}]` : ""}`);
    await sleep(PACE_MS);
  }
  const casePassRate = mean(passes.map(Number));
  const metrics = [
    ["case pass-rate", pct(casePassRate)],
    ["keyword recall", pct(mean(recalls))],
    ["scalar field accuracy", pct(scalarTotal ? scalarOk / scalarTotal : 1)],
  ];
  return { metrics, headline: { name: "case pass-rate", value: casePassRate, threshold: 0.7 } };
};

const runRouter = async () => {
  console.log(`\n${bar}\nRouter · find vs plan  (classification accuracy)\n${bar}`);
  const oks = [];
  for (const c of routerCases) {
    const pred = await withRetry(() => classifyIntent(c.q), "router");
    const ok = pred === c.expect;
    oks.push(ok);
    console.log(`  ${ICON(ok)} [${pred}] "${c.q}"${ok ? "" : ` (expected ${c.expect})`}`);
    await sleep(PACE_MS);
  }
  const accuracy = mean(oks.map(Number));
  return { metrics: [["accuracy", pct(accuracy)], ["n", String(routerCases.length)]], headline: { name: "accuracy", value: accuracy, threshold: 0.85 } };
};

const runRetrieval = async () => {
  console.log(`\n${bar}\nS3 · RAG retrieval  (hit@6 / MRR over the corpus)\n${bar}`);
  const hits = [], rrs = [];
  for (const c of retrievalCases) {
    const docs = await withRetry(() => retrieveKnowledge(c.q, { k: 6 }), "retrieval");
    const rank = firstMatchRank(docs, retrievalPredicate(c.expect));
    hits.push(rank > 0 ? 1 : 0);
    rrs.push(rank > 0 ? 1 / rank : 0);
    console.log(`  ${ICON(rank > 0)} "${c.q}"  ${rank > 0 ? `rank ${rank}` : "MISS"}`);
    await sleep(PACE_MS);
  }
  const hitRate = mean(hits);
  return { metrics: [["hit@6", pct(hitRate)], ["MRR", mean(rrs).toFixed(2)]], headline: { name: "hit@6", value: hitRate, threshold: 0.85 } };
};

const runConcierge = async () => {
  console.log(`\n${bar}\nS3 · Concierge faithfulness  (LLM-as-judge + grounding checks)\n${bar}`);
  const faithfuls = [], scores = [], preOks = [];
  for (const c of conciergeCases) {
    const res = await withRetry(() => askConcierge({ messages: [{ role: "user", content: c.q }] }), "concierge");
    // Deterministic pre-checks: did it cite sources / surface real tours when it should?
    let preOk = true;
    if (c.expectSources) preOk = preOk && (res.sources?.length || 0) > 0;
    if (c.expectTours) preOk = preOk && (res.tourIds?.length || 0) > 0;
    // Passages ground policy/logistics claims; the surfaced real tours ground any
    // journey name/price the concierge cites (catalogue facts live in find_tours,
    // not the knowledge corpus, so the judge must see both grounding sources).
    // The passages are the hand-vetted gold (evals/gold.js), NOT this concierge's own
    // retriever, so the judge isn't grading the answer against what it just fetched.
    const passages = await buildEvidence(c);
    const ids = (res.tourIds || []).filter((id) => mongoose.isValidObjectId(id));
    const docs = ids.length ? await Tour.find({ _id: { $in: ids } }, "title region duration price").lean() : [];
    const tours = docs.map((t) => ({ title: t.title, region: t.region, durationDays: t.duration, price: t.price }));
    const j = await withRetry(() => judgeGrounding({ question: c.q, kind: c.kind, answer: res.reply, passages, tours }), "judge");
    const faithful = j.faithful && preOk;
    faithfuls.push(faithful ? 1 : 0);
    scores.push(j.score);
    preOks.push(preOk ? 1 : 0);
    console.log(`  ${ICON(faithful)} [${c.kind}] "${c.q}"  judge ${j.score}/5${j.invented ? " INVENTED" : ""}${preOk ? "" : " pre-check✗"}\n      ↳ ${j.reason}`);
    await sleep(PACE_MS);
  }
  const faithfulRate = mean(faithfuls);
  return {
    metrics: [["faithful rate", pct(faithfulRate)], ["mean judge score", `${mean(scores).toFixed(2)}/5`], ["grounding pre-checks", pct(mean(preOks))]],
    headline: { name: "faithful rate", value: faithfulRate, threshold: 0.8 },
  };
};

const TASKS = {
  search: runSearch,
  router: runRouter,
  retrieval: runRetrieval,
  concierge: runConcierge,
  // Measurement task (RAG vs full-context stuffing). Excluded from the default set
  // because it doubles concierge cost; run via --only=ablation.
  ablation: () => runAblation({ sleep, PACE_MS, withRetry, bar, ICON }),
};
// The default `npm run eval` set, ablation is opt-in (see above).
const DEFAULT_TASKS = ["search", "router", "retrieval", "concierge"];

// Main

const run = async () => {
  if (!process.env.MONGO_URI) return console.error("MONGO_URI not set. Aborting."), process.exit(1);
  if (!isAIConfigured()) return console.error("GEMINI_API_KEY not set. Aborting."), process.exit(1);

  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.split("=")[1].split(",").map((s) => s.trim()) : DEFAULT_TASKS;
  const selected = only.filter((t) => TASKS[t]);
  if (!selected.length) return console.error(`No valid tasks in --only. Choose from: ${Object.keys(TASKS).join(", ")}`), process.exit(1);

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`AI eval harness · model ${AI_MODEL} · tasks: ${selected.join(", ")}`);

  // Fail fast if the faithfulness gold has drifted from the corpus (re-seed/edit).
  if (selected.includes("concierge") || selected.includes("ablation")) {
    await assertGoldResolves(ablationCases);
  }

  const summary = [];
  for (const name of selected) {
    try {
      const { metrics, headline } = await TASKS[name]();
      const pass = headline.value >= headline.threshold;
      metrics.forEach(([k, v]) => console.log(`    ${k}: ${v}`));
      summary.push({ name, headline, pass, status: pass ? "PASS" : "FAIL" });
    } catch (err) {
      console.log(`    ⚠ ${name} could not run: ${err.message}`);
      summary.push({ name, headline: null, pass: null, status: "SKIP" });
    }
  }

  console.log(`\n${bar}\nSCORECARD\n${bar}`);
  for (const s of summary) {
    const h = s.headline ? `${s.headline.name} ${pct(s.headline.value)} (>= ${pct(s.headline.threshold)})` : "-";
    console.log(`  ${s.status.padEnd(5)} ${s.name.padEnd(11)} ${h}`);
  }

  const failed = summary.filter((s) => s.status === "FAIL");
  console.log(`\n${failed.length ? `✗ ${failed.length} task(s) below threshold` : "✓ all tasks passed"}`);
  await mongoose.disconnect();
  process.exit(failed.length ? 1 : 0);
};

run().catch(async (err) => {
  console.error("Eval harness failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
