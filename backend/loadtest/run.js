// Load test for the public read API (autocannon). Measures the REAL page-traffic
// read path, catalogue list, tour detail, featured, public knowledge, NOT the AI
// endpoints (/search,/assist,/plan,/ask): those sit behind aiLimiter + the Gemini
// free tier and would just 429, telling us nothing about app throughput.
//
// Honesty knobs: a discarded WARMUP run primes TLS/keep-alive + the DB pool before
// the measured run; every endpoint reports non-2xx (the req/s number is only valid
// at ~0 errors). Parameterised so a prod run can RAMP concurrency and stop at the
// highest healthy level rather than pushing a live box into failure.
//
//   TARGET=https://classicindianjourneys.com CONN=25 DUR=20 node loadtest/run.js
import autocannon from "autocannon";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET = (process.env.TARGET || "http://127.0.0.1:8000").replace(/\/$/, "");
const CONN = Number(process.env.CONN || 10);
const DUR = Number(process.env.DUR || 20);
const WARMUP = Number(process.env.WARMUP || 5);
const TOUR_ID = process.env.TOUR_ID || fs.readFileSync(path.join(__dirname, "tourid.txt"), "utf8").trim();

const ENDPOINTS = [
  { name: "GET /tours (catalogue list)", path: "/api/v1/tours" },
  { name: "GET /tours/:id (detail)", path: `/api/v1/tours/${TOUR_ID}` },
  { name: "GET /tours/featured", path: "/api/v1/tours/featured" },
  { name: "GET /knowledge (public browse)", path: "/api/v1/knowledge" },
];

const fire = (url, connections, duration) =>
  autocannon({ url, connections, duration, pipelining: 1, headers: { "accept-encoding": "gzip" } });

const kb = (b) => (b / 1024).toFixed(0);
const summarise = (r) => ({
  reqPerSec: Math.round(r.requests.average),
  p50: r.latency.p50, p90: r.latency.p90, p99: r.latency.p99, max: r.latency.max,
  bytesPerReq: Math.round(r.throughput.total / Math.max(1, r.requests.total)),
  non2xx: r.non2xx, errors: r.errors, timeouts: r.timeouts, total: r.requests.total,
});

const run = async () => {
  console.log(`\nTARGET=${TARGET}  connections=${CONN}  duration=${DUR}s  warmup=${WARMUP}s`);
  console.log(`CPU cores: ${(await import("os")).cpus().length}\n`);
  const rows = [];
  for (const ep of ENDPOINTS) {
    const url = TARGET + ep.path;
    process.stdout.write(`- ${ep.name}\n    warmup...`);
    await fire(url, CONN, WARMUP); // discarded
    process.stdout.write(" measuring...\n");
    const s = summarise(await fire(url, CONN, DUR));
    const health = s.non2xx === 0 && s.errors === 0 && s.timeouts === 0 ? "OK" : "⚠ DEGRADED";
    console.log(`    ${s.reqPerSec} req/s | p50 ${s.p50}ms p90 ${s.p90}ms p99 ${s.p99}ms max ${s.max}ms | ${kb(s.bytesPerReq)}KB/req | non2xx=${s.non2xx} err=${s.errors} timeout=${s.timeouts} | ${health}\n`);
    rows.push({ endpoint: ep.name, connections: CONN, duration: DUR, ...s });
  }
  const out = path.join(__dirname, `results.c${CONN}.json`);
  fs.writeFileSync(out, JSON.stringify({ target: TARGET, connections: CONN, duration: DUR, ranAt: new Date().toISOString(), rows }, null, 2));
  console.log(`-> wrote ${out}`);
  const bad = rows.some((r) => r.non2xx || r.errors || r.timeouts);
  if (bad) console.log("⚠ Some endpoints degraded at this concurrency, do NOT step up.");
};

run().catch((e) => { console.error(e); process.exit(1); });
