// Multi-core entry point. The Express app is single-threaded, so on its own it uses
// just one CPU core no matter how many the box has. This forks one worker per core
// (overridable via WEB_CONCURRENCY) so all cores serve traffic; the cluster module
// lets the workers share the listen port (OS round-robin). Dead workers respawn.
//
// The in-memory read cache (utils/responseCache.js) is per-process, so a mutation in
// one worker must invalidate the others: workers send a cache-bust up to the primary
// over IPC and the primary fans it out to every worker. Falls back to a plain single
// process (just index.js) when only one worker is warranted, so nothing changes locally.
import cluster from "node:cluster";
import os from "node:os";

const count = Number(process.env.WEB_CONCURRENCY) || os.availableParallelism?.() || os.cpus().length || 1;

if (cluster.isPrimary && count > 1) {
  console.log(`[cluster] primary ${process.pid} -> forking ${count} workers`);
  for (let i = 0; i < count; i++) cluster.fork();

  // Fan a cache-bust from any one worker out to ALL workers (cluster-wide invalidation).
  cluster.on("message", (_worker, msg) => {
    if (msg?.type === "cache:clear") {
      for (const id in cluster.workers) cluster.workers[id].send(msg);
    }
  });

  cluster.on("exit", (worker, code, signal) => {
    console.error(`[cluster] worker ${worker.process.pid} exited (${signal || code}); respawning`);
    cluster.fork();
  });
} else {
  await import("./index.js");
}
