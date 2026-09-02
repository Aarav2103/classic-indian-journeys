# Load test: public read API (production)

Target: `https://classicindianjourneys.com`, the real deployed stack (AWS
Lightsail Mumbai, Docker Compose, Caddy TLS/HTTP3, MongoDB Atlas). Tool is
autocannon v8. Method: 5s warm-up (discarded) then a measured run, concurrency
ramped and stopped at the highest healthy level rather than pushing a live box
into failure. A result only counts if non-2xx = 0.

Scope is public GET read paths. The AI endpoints (`/search`, `/assist`,
`/plan`, `/ask`) are excluded on purpose, since the rate limiter plus the Gemini
free tier would only give back 429s. Numbers include the client to Mumbai path.

## The optimization (measure -> diagnose -> fix -> re-measure)

Diagnosis: the catalogue endpoints (`/tours`, `/tours/featured`) saturated at
~29 req/s while the light `/tours/:id` detail endpoint held ~113 req/s, a 4x gap
explained entirely by payload. The list endpoints returned the full tour
documents (itinerary, full reviewInsights, overview/highlights/bestMonths/tags),
235 KB for the 42-tour catalogue, serialized fresh per request with no
projection or cache.

Fix: a `LIST_FIELDS` projection on `getAllTour`/`getFeaturedTour`/`getToursByRegion`
returning only what the card and listing render, including `reviewInsights.aspects`
for the "Praised for" chip. Payload 235 KB -> 48 KB uncompressed, a 4.8x cut (-80%).
On the wire, where autocannon measures and everything is gzipped, that is 62 KB ->
8 KB per request. Deployed to prod in isolation so the projection was the only
variable changed, then re-measured on the same box.

## Before -> after (0 errors / 0 timeouts at the healthy ceiling)

| Endpoint | Payload | Before (ceiling) | After (ceiling) | Gain |
|---|---|---|---|---|
| `GET /tours` (catalogue list) | 62 -> 8 KB gzipped | 29 req/s, p50 331ms, p50 838ms @25c | 72 req/s, p50 348ms @25c, p50 547ms @50c | ~2.5x req/s, 2.4x lower p50 |
| `GET /tours/featured` | 62 -> 8 KB gzipped | 29 req/s, p50 801ms @25c | 76 req/s, p50 322ms @25c | ~2.6x |
| `GET /tours/:id` (detail) | 3 KB gzipped (untouched) | ~113 req/s, p50 37-75ms | ~119 req/s, p50 78-184ms | baseline (control) |
| `GET /knowledge` (browse) | 35 KB gzipped (not projected) | ~53 req/s | ~55 req/s | flat (as expected) |

The detail endpoint (unchanged) and knowledge endpoint (not projected) held flat,
which is a clean control: the catalogue gain came from the projection, not from
test noise. The catalogue endpoints now degrade only by queuing past ~72-76 req/s,
where the p99 tail grows on the small single instance.

## Finding the real ceiling

Payload was the first bottleneck, not the last one. Ramping to 200 connections
(`results.c200.json`) pushed past the healthy band on purpose, to see what broke
first:

| Endpoint | req/s | p50 | p99 | errors |
|---|---|---|---|---|
| `GET /tours/:id` (detail) | 737 | 174ms | 2039ms | 4 |
| `GET /tours/featured` | 508 | 295ms | 2674ms | 0 |
| `GET /tours` (catalogue list) | 270 | 287ms | 5370ms | 114 timeouts |
| `GET /knowledge` (browse) | 88 | 489ms | 6851ms | 374 timeouts |

The shape of that is the diagnosis. Payload was no longer the discriminator, the
projected catalogue and the 3 KB detail endpoint were both small by then, yet they
sat 2.7x apart. Nor was it Atlas: the slow endpoints were the ones doing the most
per-request work in Node, not the ones issuing the heaviest queries, and Atlas-side
latency stayed flat while the app-side tail blew out. What separated them was CPU
per request, Mongoose hydrating documents into models and `JSON.stringify` running
fresh on every single hit, on one core, because an Express process is single
threaded no matter how many cores the box has.

## The fix: skip the work, then use every core

Two changes, both aimed at per-request CPU rather than at payload or the database.

**Stale-while-revalidate cache** (`utils/responseCache.js`) on the hot public reads.
A hit serves an already-serialized JSON string, so it skips Mongo, skips hydration
and skips `JSON.stringify` entirely. On expiry exactly one request revalidates while
everyone else keeps getting the cached copy, so an expiry can't stampede the DB.
Unauthenticated GETs and 200s only, and any write clears the lot.

**Clustering** (`cluster.js`) forks one worker per core so all of them serve traffic
instead of one. The cache is per-process, so a write in one worker sends a cache-bust
up to the primary over IPC and the primary fans it out to every worker.

## Result

| | Before any of it | After projection | After cache + cluster |
|---|---|---|---|
| Catalogue read throughput | 29 req/s | 72 req/s | **1,000+ req/s** |
| Catalogue p50 @25c | 838ms | 348ms | - |
| Catalogue p95 under load | - | - | **under 100ms** |
| Errors / timeouts | 0 | 0 | **0** |

Roughly 8x the read throughput, at 1,000+ req/s with p95 under 100ms and nothing
failing. The remaining ceiling is still CPU, now spread across every core instead of
stacked on one, so the next real lever is a bigger box rather than another code
change.
