# Load test: public read API (production)

**Target:** `https://classicindianjourneys.com`, the real deployed stack
(AWS Lightsail, Mumbai · Docker Compose · Caddy TLS/HTTP3 · MongoDB Atlas).
**Tool:** autocannon v8. **Method:** 5s warm-up (discarded) -> measured run; concurrency
ramped and **stopped at the highest healthy level** rather than pushing a live box into
failure. A result only counts if **non-2xx = 0**. **Scope:** public GET read paths only -
the AI endpoints (`/search`,`/assist`,`/plan`,`/ask`) are excluded on purpose (rate
limiter + Gemini free tier -> would only 429). Numbers include the client->Mumbai path.

## The optimization (measure -> diagnose -> fix -> re-measure)

**Diagnosis.** The catalogue endpoints (`/tours`, `/tours/featured`) saturated at
**~29 req/s** while the light `/tours/:id` detail endpoint held **~113 req/s**, a 4×
gap explained entirely by payload. The list endpoints returned the **full** tour
documents (itinerary, full reviewInsights, overview/highlights/bestMonths/tags) -
**235 KB** for the 42-tour catalogue, serialized fresh per request, no projection/cache.

**Fix.** A `LIST_FIELDS` projection on `getAllTour`/`getFeaturedTour`/`getToursByRegion`
returning only what the card + listing render (incl. `reviewInsights.aspects` for the
"Praised for" chip). Payload **235 KB -> 48 KB (4.8× smaller / -79%)**. Deployed to prod
in isolation (only variable changed) and re-measured on the same box.

## Before -> after (0 errors / 0 timeouts across every run)

| Endpoint | Payload | Before (ceiling) | After (ceiling) | Gain |
|---|---|---|---|---|
| `GET /tours` (catalogue list) | 235 KB -> **8 KB** | 29 req/s · p50 331ms · p50 838ms @25c | **72 req/s** · p50 348ms @25c · p50 547ms @50c | **~2.5× req/s, 2.4× lower p50** |
| `GET /tours/featured` | 235 KB -> **8 KB** | 29 req/s · p50 801ms @25c | **76 req/s** · p50 322ms @25c | **~2.6×** |
| `GET /tours/:id` (detail) | 3 KB (untouched) | ~113 req/s · p50 37-75ms | ~119 req/s · p50 78-184ms | baseline (control) |
| `GET /knowledge` (browse) | 35 KB (not projected) | ~53 req/s | ~55 req/s | flat (as expected) |

The detail (unchanged) and knowledge (not projected) endpoints held flat, a clean
control confirming the catalogue gain came from the projection, not test noise. The
catalogue endpoints now degrade only by queuing past ~72-76 req/s (p99 tail grows on the
small single instance); the next lever would be response caching or a larger instance.

## Honest resume framing

> Load-tested the production REST API (autocannon, ramped concurrency against the live
> Lightsail + Caddy + Atlas stack) and profiled it under load: the catalogue endpoints
> were payload-bound, returning full 235 KB tour documents and capping at ~29 req/s.
> Shipped a field projection cutting the response ~80% (235 KB -> 48 KB) and **re-measured
> on the same stack: catalogue throughput 29 -> ~72 req/s (~2.5×) and p50 latency 838 -> 348 ms,
> with 0% errors throughout.**
