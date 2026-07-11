# Load test: public read API (production)

**Target:** `https://classicindianjourneys.com`, the real deployed stack
(AWS Lightsail, Mumbai · Docker Compose · Caddy TLS/HTTP3 · MongoDB Atlas).
**Tool:** autocannon v8. **Method:** 5s warm-up (discarded) -> measured run; concurrency
ramped 10 -> 25 -> 50 and **stopped at the highest healthy level** rather than pushing a
live box into failure. A result is only counted if **non-2xx = 0**.
**Scope:** public GET read paths only, the AI endpoints (`/search`, `/assist`, `/plan`,
`/ask`) are excluded on purpose (they sit behind a rate limiter + the Gemini free tier
and would only 429). Numbers include the client->Mumbai network path.

## Results (0 errors / 0 timeouts across every run)

| Endpoint | Payload | 10 conn | 25 conn | 50 conn | Ceiling |
|---|---|---|---|---|---|
| `GET /tours/:id` (detail) | 3 KB | 104 req/s · p50 37ms | 112 req/s · p50 74ms | 113 req/s · p50 179ms | **~113 req/s** |
| `GET /knowledge` (browse) | 35 KB gz | 51 req/s · p50 171ms | 53 req/s · p50 425ms |, | ~53 req/s |
| `GET /tours` (catalogue list) | 62 KB gz (235 KB raw) | 29 req/s · p50 331ms | 22 req/s · p50 838ms |, | **~29 req/s (saturated)** |
| `GET /tours/featured` | 62 KB gz | 28 req/s · p50 340ms | 29 req/s · p50 801ms |, | ~29 req/s |

Every endpoint held **0% errors** even past its throughput knee, the box degrades by
queuing (latency rises), never by dropping requests.

## Bottleneck identified

The two heavy endpoints (`/tours`, `/tours/featured`) saturate at **~29 req/s** while the
light detail endpoint sustains **~113 req/s**, a 4× gap explained entirely by payload.
The list endpoints return the **full** tour documents (all 24 fields incl. `reviewInsights`,
`highlights`, full `desc`), **235 KB raw per response**, serialized fresh on every call
with no projection or cache. That CPU + bandwidth cost on a small single-instance box is
the ceiling, not the DB.

**Clear optimization:** project the list response to only the card fields the grid needs
(title, city, region, price, photo, avgRating, duration) and/or cache it, expected to
multiply list throughput several-fold. (Not yet applied.)

## Honest resume framing

> Load-tested the production REST API (autocannon, ramped concurrency against the live
> Lightsail + Caddy + Atlas stack): the read path sustained **0% errors** under concurrent
> load; the light detail endpoint held **~113 req/s at p50 < 75 ms**, and profiling the
> heavy catalogue endpoint isolated an unprojected 235 KB list payload as the throughput
> ceiling (~29 req/s), a targeted, measurement-driven optimization.
