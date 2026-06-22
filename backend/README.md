# Backend

Express + Mongoose API. Full setup, env and seeding instructions are in the
[root README](../README.md).

## Quick reference

```bash
cp .env.example .env      # then fill MONGO_URI + JWT_SECRET (and GEMINI_API_KEY for AI)
npm install
npm run dev               # nodemon on :8000
npm run eval              # AI evaluation harness
```

Seed scripts (run from this directory, in order):
`seed:admin -> seed:tour-details -> seed:tour-content -> seed:knowledge -> seed:reviews -> seed:review-insights`.

Key dirs: `ai/` (reusable AI modules), `controllers/`, `router/`, `models/`, `utils/`,
`evals/`. Entry point: `index.js`.
