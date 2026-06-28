# Classic Indian Journeys

A MERN tours-and-travel platform for a domestic-India travel studio, with an AI
layer built on top: natural-language tour search, a conversational trip planner,
a RAG concierge over an authored knowledge corpus, and review-sentiment
insights. All AI features are grounded in the site's real data, degrade cleanly
when unconfigured, and are scored by an evaluation harness.

Without `GEMINI_API_KEY`, AI endpoints return 503 and the UI falls back to
ordinary keyword filters; the rest of the app runs normally.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18, Vite, Tailwind (custom `ds-*` design system), framer-motion, react-router |
| Backend  | Express, Mongoose (MongoDB Atlas), ESM, JWT auth, zod validation, helmet, express-rate-limit, optional nodemailer |
| AI       | Google Gemini (`@google/genai`) for chat/extraction + embeddings; MongoDB Atlas Vector Search for RAG |

## Layout

```
backend/      Express API
  ai/         reusable AI modules (client, structured output, search, agent,
              router, embeddings, retrieve, concierge, reviews)
  controllers/ router/ models/ utils/
  evals/      AI evaluation harness (npm run eval)
  seed*.js    data + corpus seeders (see "Seeding")
frontend/     React + Vite app
  src/components/ai/      SmartSearch, Concierge, ItineraryView
  src/components/reviews/ ReviewInsights
  src/admin/              admin panel
```

## Getting started

Prerequisites: Node 20 (see `.nvmrc`), a MongoDB Atlas cluster (the RAG feature
uses Atlas Vector Search, available on the free M0 tier), and optionally a
Gemini API key (https://aistudio.google.com/apikey).

### 1. Install

```bash
npm install                      # root: dev tooling (concurrently)
npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env   # optional in dev (Vite proxies /api)
```

Fill in `backend/.env`, at minimum `MONGO_URI` and a strong `JWT_SECRET`
(`openssl rand -base64 48`). The server refuses to boot on a weak secret or a
localhost `CLIENT_URL` in production. Add `GEMINI_API_KEY` to enable AI. Every
option is documented in `.env.example`.

### 3. Seed data

Run from `backend/` (the scripts load `.env` from the current directory). Order
matters, content and reviews must exist before insights and the corpus:

```bash
cd backend
npm run seed:admin            # first admin user (ADMIN_* in .env)
npm run seed:tour-details     # numeric fields (price/duration/rating)
npm run seed:tour-content     # AI: overview/tags/highlights/itinerary   (needs GEMINI_API_KEY)
npm run seed:knowledge        # AI: RAG corpus + Atlas vector index      (needs key)
npm run seed:reviews          # AI: guest reviews                        (needs key)
npm run seed:review-insights  # AI: review-intelligence rollup           (needs key; after reviews)
```

The AI seeders are idempotent (re-running skips finished work; `--force`
rebuilds) and pace themselves under free-tier rate limits.

### 4. Run

```bash
npm run dev    # from the repo root, backend (:8000) + frontend (:3000)
```

Or individually: `npm run dev --prefix backend` and `npm run dev --prefix frontend`.
The Vite dev server proxies `/api` to `localhost:8000`.

## AI architecture

All AI endpoints are public and rate-limited (`aiLimiter`):

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/tours/assist` | Smart box, routes a query to find or plan |
| `POST /api/v1/tours/search` | Natural language -> tours + interpreted intent |
| `POST /api/v1/tours/plan/chat` | Conversational, grounded itinerary planner |
| `POST /api/v1/tours/ask` | RAG concierge (knowledge + tour tools), returns citations |
| `GET  /api/v1/tours/ai-status` | Probe so the UI can hide AI when unconfigured |
| `GET  /api/v1/knowledge` | Read-only corpus (powers FAQ / Policies / Guides) |

The model emits validated intents (zod schemas), never raw Mongo queries; the
tour catalogue is served by structured search while policy/knowledge answers
come from vector RAG, so the two cannot hallucinate into each other. The
default model occasionally drops a field, so `ai/search.js` keeps deterministic
regex fallbacks for price and keywords.

### Evaluations

```bash
cd backend && npm run eval        # --only=search,router,retrieval,concierge
```

Deterministic scoring (intent field-match, router accuracy, retrieval hit@k and
MRR) plus LLM-as-judge concierge faithfulness, against labeled fixtures in
`evals/`. Exits non-zero on regression. Requires a Gemini key and uses live
quota (paced to respect free-tier limits).

## Admin

The admin panel lives at `/admin` (log in with the seeded admin account):
journey editor with an itinerary builder, featured curation, knowledge CRUD
that re-embeds on edit so retrieval never drifts from edited text, and
soft-delete with a Trash view across all content types.

## Deployment notes

- Set `NODE_ENV=production`, a real comma-separated `CLIENT_URL`, and a 32+
  char `JWT_SECRET`, validated at boot.
- `GET /healthz` reports 503 when the DB link is down.
- Build the frontend with `npm run build --prefix frontend`; set
  `VITE_BACKEND_URL` to the API origin for production builds.

## Known limitations

- The JWT is stored in localStorage and lives 15 days; there is no refresh or
  revocation flow. Acceptable for this scope, not for handling real payments.
- Password reset is admin-mediated: users change their own password from the
  account menu (current password required), and an admin can set a new one for
  a locked-out user. There is no email-based self-service reset.
- AI features run on the Gemini free tier, so heavy use can hit daily quotas;
  every feature degrades to a non-AI fallback.
- No unit-test suite; verification is the eval harness plus CI build checks.

## License

ISC.
