# Classic Indian Journeys

Travel platform for a studio selling private, guided journeys inside India.
Public catalogue and booking flow, an admin panel the owner runs without me, and
an AI layer over the top that stays grounded in the real catalogue instead of
making things up.

MERN, deployed on a single AWS Lightsail box behind Caddy.

## What's in it

**Public site.** Catalogue with filters, tour detail pages with itineraries and
review intelligence, guides, FAQs, enquiries, bookings, wishlist, auth.

**Admin panel.** Built for a non-technical operator: itinerary editor, knowledge
CRUD, moderation, bookings and enquiries. Every delete is a soft delete with a
Trash view to restore from, because whoever uses it will eventually delete the
wrong row.

**AI layer.** Four features, one rule across all of them: the model never invents
catalogue or policy facts.

- Natural-language search that turns "somewhere cool in April, about a week" into
  a real Mongo query via structured output
- A planner agent that builds day-by-day itineraries, only out of tours that
  actually exist, by id
- A RAG concierge over an authored knowledge corpus (Atlas Vector Search), with
  the structured catalogue search handed to it as a tool
- Review intelligence: aspect-level sentiment across a tour's reviews, rolled up
  into cached pros and cons

## Grounding

The catalogue lives in structured search, the knowledge corpus lives in vector
RAG, and they deliberately don't overlap. The concierge picks a tool. It can't
answer a policy question from memory, and any journey it names has to come back
from `find_tours` first. Knowledge chunks carry region and tour metadata so
retrieval can be filtered, which is what keeps "what's included on the Ladakh
trip" from landing on some other tour's fine print.

## Evals

`backend/evals/` is a real harness rather than a smoke test. The eval set is
generated from the actual corpus so the source chunk is the ground truth and
retrieval isn't graded circularly. There's an LLM judge for faithfulness that
uses retriever-independent gold evidence, and a scoped-correctness judge for
whether an answer is even about the right journey.

The generated set is 459 queries, 444 anchored to a source chunk plus 15 adversarial
ones (foreign trips, medical advice, privacy, a prompt injection). Answers are graded
by a judge from a different model family than the one that wrote them, so a Gemini
answer is never marked by a Gemini judge: 99.1% relevant, 96.0% correct, and all 15
adversarial requests declined.

The same 444 anchored queries settled the retrieval architecture. Hybrid search
(vector + BM25 + RRF) lost to plain vector at every k, hit@1 80.9% vs 60.4% and MRR
0.90 vs 0.74, because equal-weight fusion blends the dense ranking with a noisier
BM25 one and demotes the semantically-correct top hit. A weighting sweep checked
whether any lighter BM25 ratio recovered that; none did, so production runs
vector-only. There's also a RAG-vs-stuffing ablation that puts the same questions
through both arms, to check whether retrieval is earning its place at this corpus
size.

```bash
npm run eval                 # CI gate, labeled fixtures
npm run eval:concierge       # 459-query cross-family judge run
npm run eval:retrieval       # hybrid vs vector-only
npm run eval:ablation        # RAG vs full-context stuffing
```

## Performance

`backend/loadtest/` has the autocannon setup and the write-up, measured against the
real deployed box with the untouched detail endpoint sitting there as a control.

The catalogue list endpoints were returning full tour documents, 235 KB for 42
tours, serialized fresh on every request. A field projection cut that ~80% and took
throughput from 29 to 72 req/s. Ramping to 200 connections then showed payload
wasn't the ceiling any more: what was left was per-request CPU, Mongoose hydration
and `JSON.stringify` on a single core, not payload and not Atlas. A
stale-while-revalidate cache that serves pre-serialized JSON, plus clustering across
every core, took the catalogue past 1,000 req/s with p95 under 100ms and no errors.

## Stack

React, Vite and Tailwind on the front. Express, Mongoose and MongoDB Atlas on the
back, Gemini for the AI layer, Atlas Vector Search for retrieval. In production the
API runs clustered, one worker per core behind the Node cluster module. Docker
Compose and Caddy on the box, GitHub Actions for CI and push-to-deploy.

## Running it

```bash
cd backend
cp .env.example .env       # MONGO_URI + JWT_SECRET at minimum
npm install

cd ../frontend
cp .env.example .env
npm install

cd .. && npm run dev       # backend :8000, frontend :3000
```

`GEMINI_API_KEY` is optional. Without it the AI endpoints return 503 and the UI
falls back to keyword filters. Everything else works.

## Seeding

Order matters, the later scripts read what the earlier ones wrote. From
`backend/`:

```bash
npm run seed:admin
npm run seed:tour-details
npm run seed:tour-content
npm run seed:knowledge
npm run seed:tour-knowledge
npm run seed:knowledge-extra
npm run seed:reviews
npm run seed:review-insights
```

The knowledge seeders call Gemini and embed every chunk, so they cost real quota
and checkpoint to JSON as they go. Most take `--force`, which only wipes what
that particular script owns.

## Layout

```
backend/ai/           search, planner agent, concierge, retrieval, embeddings
backend/evals/        eval harness, judges, ablation
backend/loadtest/     autocannon runner + results
backend/controllers/  route handlers
backend/models/       mongoose schemas
frontend/src/pages/   public pages
frontend/src/admin/   admin panel
deploy/               Caddyfile, web image, prod env template
```
