import mongoose from "mongoose";
import Tour from "../models/Tour.js";
import KnowledgeArticle from "../models/KnowledgeArticle.js";
import { askConcierge } from "../ai/concierge.js";
import { askConciergeStuffed } from "../ai/conciergeStuffed.js";
import { judgeGrounding, judgeScopedCorrectness } from "./judge.js";
import { buildEvidence } from "./gold.js";
import { ablationCases } from "./datasets.js";
import { mean, pct } from "./scorers.js";

// RAG concierge vs dumping the whole corpus into context. Same questions, same
// judge, same find_tours tool. Only difference is whether knowledge gets
// vector-retrieved top-k or shoved in wholesale. Reports quality, prompt-token
// cost and latency, which is what says whether RAG earns its keep at the current
// corpus size.
//
// At this corpus size I expect them to tie on quality with the stuffed arm burning
// far more tokens. That's the first data point. Re-run as the corpus grows to find
// where stuffing starts to fall over. Not a CI gate on the comparison itself, it
// only fails if the RAG arm stops being faithful.
//
// Left out of the default eval run since it doubles concierge cost:
//   npm run eval -- --only=ablation

export const runAblation = async ({ sleep, PACE_MS, withRetry, bar, ICON }) => {
  console.log(`\n${bar}\nAblation · RAG vs full-context stuffing  (quality / tokens / latency)\n${bar}`);

  // Measure BOTH arms deterministically (product default is 0.5 for warmth). The
  // agent loop's search phrasing + final answer are otherwise stochastic, which at
  // n=12 with a strict binary faithfulness judge made the rate swing ±15-20% run to
  // run. temperature 0 -> a reproducible number. Override with EVAL_TEMPERATURE.
  const EVAL_TEMPERATURE = Number(process.env.EVAL_TEMPERATURE ?? 0);

  const arms = {
    rag: { faithful: [], judge: [], ptok: [], ms: [], scopedCorrect: [] },
    stuffed: { faithful: [], judge: [], ptok: [], ms: [], scopedCorrect: [] },
  };

  const timed = async (fn) => {
    const t0 = Date.now();
    const out = await fn();
    return { out, ms: Date.now() - t0 };
  };

  const judgeArm = async (c, res, passages) => {
    const ids = (res.tourIds || []).filter((id) => mongoose.isValidObjectId(id));
    const docs = ids.length ? await Tour.find({ _id: { $in: ids } }, "title region duration price").lean() : [];
    const tours = docs.map((t) => ({ title: t.title, region: t.region, durationDays: t.duration, price: t.price }));
    return withRetry(() => judgeGrounding({ question: c.q, kind: c.kind, answer: res.reply, passages, tours }), "ablation-judge");
  };

  // Ground truth for the scoped-correctness judge: the named entity's real facts +
  // its OWN knowledge-base text (so the judge can tell a right-entity answer from a
  // fluent wrong-entity one). tour = exact title; region = permit chunks for the slug.
  const loadGroundTruth = async (scope) => {
    if (scope.tour) {
      const t = await Tour.findOne({ title: scope.tour }, "title region duration price address").lean();
      if (!t) return { facts: `(tour "${scope.tour}" not found)`, text: "" };
      const chunks = await KnowledgeArticle.find({ category: "tour-info", tourRefs: t._id }, "title body").lean();
      return {
        facts: `${t.title}, ${t.region}, ${t.duration} days, from ₹${t.price}, route: ${t.address}`,
        text: chunks.map((c) => `${c.title}\n${c.body}`).join("\n\n"),
      };
    }
    if (scope.region) {
      // Region identity ground truth: the region's own guide + permit chunks
      // (festivals/etiquette/when-to-go/permits), enough to spot a wrong-region answer.
      const chunks = await KnowledgeArticle.find({ region: scope.region, category: { $in: ["region-guide", "permit"] } }, "title body").lean();
      return { facts: `Region: ${scope.region}`, text: chunks.map((c) => `${c.title}\n${c.body}`).join("\n\n") };
    }
    return { facts: "", text: "" };
  };

  for (const c of ablationCases) {
    // One shared, retriever-INDEPENDENT evidence bar for the judge: the hand-vetted
    // gold chunks for this question (evals/gold.js), resolved straight from the DB.
    // Both arms grade against the SAME fixed key, crucially NOT against RAG's own
    // retriever, so RAG gets no home-turf advantage. (Empty for honesty/out-of-scope/
    // catalogue cases, whose kind rubric grades on not inventing, not on support.)
    const evidence = await buildEvidence(c);
    const gt = c.scope ? await loadGroundTruth(c.scope) : null;
    const line = {};

    for (const [name, run] of [["rag", askConcierge], ["stuffed", askConciergeStuffed]]) {
      try {
        // At a large corpus the stuffed arm re-sends the whole (~115k-token) corpus on
        // EVERY agent turn, so a tool-using query can blow a per-minute token budget in a
        // single interaction. Fail FAST there (tries=1) rather than let withRetry re-spend
        // the exhausted budget 6×, then cool down and record the case as unmeasurable at
        // this corpus size (itself a finding), instead of aborting the whole run.
        const tries = name === "stuffed" ? 1 : 6;
        const { out: res, ms } = await timed(() => withRetry(() => run({ messages: [{ role: "user", content: c.q }], temperature: EVAL_TEMPERATURE }), `ablation-${name}`, tries));

        const j = await judgeArm(c, res, evidence);
        const a = arms[name];
        a.faithful.push(j.faithful ? 1 : 0);
        a.judge.push(j.score);
        a.ptok.push(res.usage?.promptTokens || 0);
        a.ms.push(ms);
        line[name] = { faithful: j.faithful, judge: j.score, ptok: res.usage?.promptTokens || 0, ms };

        if (gt) {
          // The sharper quality axis: did THIS arm answer about the RIGHT entity?
          const sc = await withRetry(() => judgeScopedCorrectness({ question: c.q, answer: res.reply, facts: gt.facts, groundTruth: gt.text }), `ablation-scoped-${name}`);
          a.scopedCorrect.push(sc.correct ? 1 : 0);
          line[name].scoped = sc;
        }
      } catch (e) {
        line[name] = { skipped: String(e?.message || e).replace(/\s+/g, " ").slice(0, 90) };
        arms[name].skipped = (arms[name].skipped || 0) + 1;
        await sleep(65_000); // let the per-minute token budget clear before the next case
      }
      await sleep(PACE_MS);
    }

    console.log(`  [${c.kind}]${gt ? " {scoped}" : ""} "${c.q}"`);
    for (const name of ["rag", "stuffed"]) {
      const L = line[name];
      if (!L || L.skipped) { console.log(`      ${name.padEnd(7)} ⚠ skipped (${L?.skipped || "no data"})`); continue; }
      const scopedStr = L.scoped ? `  scope ${L.scoped.correct ? "✓right-journey" : L.scoped.confused ? "✗WRONG-ENTITY" : "✗"}` : "";
      console.log(`      ${name.padEnd(7)} ${ICON(L.faithful)} judge ${L.judge}/5  ${L.ptok} ptok  ${L.ms}ms${scopedStr}`);
    }
  }

  const r = arms.rag, s = arms.stuffed;
  const ragTok = mean(r.ptok), stuffedTok = mean(s.ptok);
  const ratio = ragTok ? stuffedTok / ragTok : 0;

  const scopedN = r.scopedCorrect.length;
  const metrics = [
    ["cases measured", `RAG ${r.faithful.length} · stuffed ${s.faithful.length} (of ${r.faithful.length + (r.skipped || 0)})`],
    ["stuffed cases UNMEASURABLE (free-tier TPM)", String(s.skipped || 0)],
    ["RAG faithful", pct(mean(r.faithful))],
    ["stuffed faithful", pct(mean(s.faithful))],
    // The sharper quality axis, only over scoped cases (did it answer the RIGHT entity?).
    ["RAG scoped-correct", scopedN ? `${pct(mean(r.scopedCorrect))} (n=${scopedN})` : "-"],
    ["stuffed scoped-correct", scopedN ? `${pct(mean(s.scopedCorrect))} (n=${scopedN})` : "-"],
    ["RAG judge (mean)", `${mean(r.judge).toFixed(2)}/5`],
    ["stuffed judge (mean)", `${mean(s.judge).toFixed(2)}/5`],
    ["RAG prompt-tokens (mean)", String(Math.round(ragTok))],
    ["stuffed prompt-tokens (mean)", String(Math.round(stuffedTok))],
    ["token ratio (stuffed/RAG)", `${ratio.toFixed(1)}×`],
    ["RAG latency (mean)", `${Math.round(mean(r.ms))}ms`],
    ["stuffed latency (mean)", `${Math.round(mean(s.ms))}ms`],
  ];

  // The comparison is the deliverable; we only gate on the RAG arm staying faithful
  // (same threshold as the concierge task), never on the head-to-head.
  return { metrics, headline: { name: "RAG faithful", value: mean(r.faithful), threshold: 0.8 } };
};
