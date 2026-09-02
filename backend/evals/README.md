# AI evals

Two different things live here.

**The CI gate** (`npm run eval`) is a small, fast harness over labeled fixtures. It
prints a scorecard with pass/fail thresholds and exits non-zero on regression, so it
can gate a workflow.

**The offline studies** are the bigger, slower runs that actually decided the
retrieval architecture and measured answer quality at scale. They cost real quota
and aren't wired into CI.

## The CI gate

Two grading techniques, on purpose: deterministic scoring where a right answer
exists, LLM-as-judge where the output is open-ended.

| Task | Feature | Technique | Headline metric |
|---|---|---|---|
| `search` | NL->Mongo intent (`ai/search.js`) | deterministic, structured-output field match | case pass-rate |
| `router` | smart-box find/plan (`ai/router.js`) | deterministic, classification accuracy | accuracy |
| `retrieval` | RAG recall (`ai/retrieve.js`) | deterministic, hit@6 / MRR | hit@6 |
| `concierge` | answer grounding (`ai/concierge.js`) | LLM-as-judge (`judge.js`) + grounding pre-checks | faithful rate |

```bash
# from backend/ (loads .env; needs MONGO_URI + GEMINI_API_KEY + the vector index)
npm run eval
npm run eval -- --only=search,router      # subset
EVAL_PACE_MS=1000 npm run eval            # slow down to ease the free-tier rate limit
```

It makes live Gemini + Atlas calls, so it's paced and retries transient 429/503.
AI off (no key) => it aborts cleanly, mirroring the rest of the app.

Thresholds are deliberately honest for the free-tier `flash-lite` model; tighten in
`run.js` (each task's `headline.threshold`) if you move to a stronger model.

## The eval set

`evalset.generated.json`, 459 queries generated from the actual corpus by
`generateEvalSet.js`, so each query's ground truth is the exact chunk it came from
and retrieval isn't graded circularly.

- **444 anchored** (`goldType: "chunk"`) across 11 intents, tour inclusions/season/
  suitability, region season/etiquette/logistics/highlights, theme, faq, policy, month.
- **15 adversarial** (`goldType: "none"`), out-of-scope foreign trips and flights,
  medical advice, off-topic trivia, privacy, and one prompt injection.

```bash
npm run eval:generate
```

## Study 1: retrieval, hybrid vs vector-only

`retrievalAblation.js` runs the 444 anchored queries through both arms, hybrid
(vector + BM25 + RRF + region boost) against pure vector, sharing one embedding per
query. No LLM judge, just deterministic retrieval math against the gold chunk.

The result, committed in `evalset.generated.ablation.json`:

| Arm | hit@1 | hit@3 | hit@5 | hit@10 | MRR |
|---|---|---|---|---|---|
| **vector-only** | **80.9%** | **95.5%** | **97.1%** | **99.1%** | **0.90** |
| hybrid (equal-weight RRF) | 60.4% | 84.7% | 91.9% | 97.5% | 0.74 |

Vector-only won at every k. Equal-weight RRF blends the dense ranking with a much
noisier BM25 ranking 1:1 and demotes the semantically-correct top hit, which is
exactly where the hit@1 gap comes from.

`retrievalAblationWeighted.js` then sweeps the fusion weighting (vector-only, 1:1,
2:1, 3:1, 5:1) from a single retrieval pass per query, to check whether any light
BM25 weight recovers vector's misses without demoting its wins, rather than
cherry-picking one ratio. Production runs vector-only on the strength of this.

```bash
npm run eval:retrieval
npm run eval:retrieval:weighted
```

## Study 2: concierge answer quality, cross-family judge

`conciergeEval.js` puts every eval-set query through the real concierge (vector-only
retrieval, temp 0), then grades it with a judge from a **different model family**,
NVIDIA NIM (Nemotron) over an OpenAI-compatible endpoint, so a Gemini answer is
never graded by a Gemini judge. Needs `NVIDIA_API_KEY`.

Judging is split so neither half is unfair:

- `grounded` is judged against the evidence the concierge **actually retrieved**, not
  the single anchor, otherwise true retrieved facts get flagged as fabrication.
- `correct` is judged against the **gold reference**, right subject, no contradiction.
- adversarial rows are judged only on whether the assistant declined or redirected.

Results over the full set (444 anchored, 15 adversarial):

| Metric | Result |
|---|---|
| relevant | 99.1% |
| correct | 96.0% |
| adversarial declined | 100% (15/15) |

It checkpoints after every query and skips ids already done, so it survives a quota
cap; relaunch with a different key to rotate. Answers, retrieved evidence and gold
are all stored, so a re-judge with a different judge or prompt costs no Gemini quota.

```bash
SNAPSHOT=./evals/snapshot.json RESULTS=./evals/concierge.results.json npm run eval:concierge
```

## Study 3: RAG vs full-context stuffing

`ablation.js` puts the same questions through both arms, retrieved top-k versus the
whole corpus shoved into context, with the same judge and the same `find_tours` tool.
Reports quality, prompt-token cost and latency, which is what says whether retrieval
earns its keep at the current corpus size. Left out of the default run since it
doubles concierge cost.

```bash
npm run eval:ablation
```

## Files

- `generateEvalSet.js`, builds the 459-query set from the live corpus.
- `datasets.js`, the small labeled fixtures for the CI gate.
- `scorers.js`, pure deterministic scorers (intent field/keyword match, hit@k/MRR).
- `judge.js`, the LLM-as-judge faithfulness grader (reuses `ai/structured.js`).
- `gold.js`, retriever-independent gold evidence for the judges.
- `run.js`, CI-gate orchestrator, scorecard, thresholds, `--only`.
