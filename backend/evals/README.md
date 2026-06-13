# AI evals

A small, live evaluation harness for the site's AI features. It runs each feature
against **labeled fixtures** and prints a scorecard with **pass/fail thresholds**
(non-zero exit on regression, so it can gate CI).

Two grading techniques, on purpose, deterministic scoring where a right answer
exists, LLM-as-judge where the output is open-ended:

| Task | Feature | Technique | Headline metric |
|---|---|---|---|
| `search` | NL->Mongo intent (`ai/search.js`) | deterministic, structured-output field match | case pass-rate |
| `router` | smart-box find/plan (`ai/router.js`) | deterministic, classification accuracy | accuracy |
| `retrieval` | RAG recall (`ai/retrieve.js`) | deterministic, hit@6 / MRR | hit@6 |
| `concierge` | answer grounding (`ai/concierge.js`) | **LLM-as-judge** (`judge.js`) + grounding pre-checks | faithful rate |

## Run

```bash
# from backend/ (loads .env; needs MONGO_URI + GEMINI_API_KEY + the vector index)
npm run eval
npm run eval -- --only=search,router      # subset
EVAL_PACE_MS=1000 npm run eval            # slow down to ease the free-tier rate limit
```

It makes live Gemini + Atlas calls, so it's paced and retries transient 429/503.
AI off (no key) => it aborts cleanly, mirroring the rest of the app.

## Files

- `datasets.js`, the labeled cases (partial assertions, grounded in the real catalogue + corpus).
- `scorers.js`, pure deterministic scorers (intent field/keyword match, hit@k/MRR).
- `judge.js`, the LLM-as-judge faithfulness grader (reuses `ai/structured.js`).
- `run.js`, orchestrator, scorecard, thresholds, `--only`.

Thresholds are deliberately honest for the free-tier `flash-lite` model; tighten in
`run.js` (each task's `headline.threshold`) if you move to a stronger model.
