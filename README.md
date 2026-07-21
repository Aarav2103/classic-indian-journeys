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

There's also a RAG-vs-stuffing ablation that puts the same questions through both
arms, to check whether the retrieval architecture is earning its place at this
corpus size.

```bash
npm run eval                 # full set
npm run eval:ablation        # RAG vs full-context stuffing
```

## Performance

`backend/loadtest/` has the autocannon setup and the write-up. Short version: the
catalogue list endpoints were returning full tour documents, 235 KB for 42 tours,
serialized fresh on every request. A field projection plus a stale-while-
revalidate cache took that to 8 KB and roughly 2.5x the throughput at the same
latency, with the untouched detail endpoint sitting there as a control.

## Stack

React, Vite and Tailwind on the front. Express, Mongoose and MongoDB Atlas on the
back, Gemini for the AI layer, Atlas Vector Search for retrieval. Docker Compose
and Caddy on the box, GitHub Actions for CI and push-to-deploy.

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
