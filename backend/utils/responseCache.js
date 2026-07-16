// In-memory stale-while-revalidate cache for the hot public reads, tours
// catalogue and knowledge browse. At concurrency the thing killing p95 isn't
// payload size, it's per-request DB round-trips queuing on a small connection
// pool. Serving a pre-serialized JSON string skips Mongo entirely on a hit.
//
// On expiry exactly one request revalidates while everyone else keeps getting the
// cached copy, so an expiry doesn't stampede the DB.
//
// Unauthenticated GETs only, 200s only. Per-process, so a restart clears it, and
// any tour or knowledge write clears the lot. Admin writes are rare enough that
// clear-all is the simple safe option. Keyed by full URL so pagination and region
// variants stay separate.
const store = new Map(); // key -> { body: string, expires: number, refreshing: boolean }
const localClear = () => store.clear();

// Cluster-aware invalidation: in a forked worker (process.send exists), apply
// cache-busts that the primary fans out from a sibling worker (see cluster.js).
if (typeof process.send === "function") {
  process.on("message", (msg) => { if (msg?.type === "cache:clear") localClear(); });
}

export const cacheRead = (ttlMs = 60_000, keyFn = (req) => req.originalUrl) => (req, res, next) => {
  const key = keyFn(req);
  const now = Date.now();
  const hit = store.get(key);
  const send = (state, body) => {
    res.set("Cache-Control", `public, max-age=${Math.floor(ttlMs / 1000)}`);
    res.set("X-Cache", state);
    return res.type("application/json").send(body);
  };

  if (hit) {
    if (hit.expires > now) return send("HIT", hit.body);
    // Expired: the first caller revalidates; concurrent callers serve stale (no stampede).
    if (hit.refreshing) return send("STALE", hit.body);
    hit.refreshing = true;
    // Safety net: if the revalidating request errors out without repopulating,
    // release the lock so a later request can retry instead of serving stale forever.
    res.on("finish", () => { const cur = store.get(key); if (cur === hit && cur.refreshing) cur.refreshing = false; });
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200) {
      try { store.set(key, { body: JSON.stringify(body), expires: Date.now() + ttlMs, refreshing: false }); } catch { /* skip uncacheable */ }
    }
    res.set("Cache-Control", `public, max-age=${Math.floor(ttlMs / 1000)}`);
    res.set("X-Cache", hit ? "REVALIDATED" : "MISS");
    return originalJson(body);
  };
  next();
};

// Bust everything on any write, cheap and avoids stale catalogue/knowledge reads.
// In cluster mode also tell the primary to fan the bust out to sibling workers.
export const clearReadCache = () => {
  localClear();
  if (typeof process.send === "function") process.send({ type: "cache:clear" });
};
