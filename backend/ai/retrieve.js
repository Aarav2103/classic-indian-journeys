import mongoose from "mongoose";
import KnowledgeArticle from "../models/KnowledgeArticle.js";
import { embedQuery, EMBED_DIM } from "./embeddings.js";

// Retrieval layer for the RAG concierge. HYBRID retrieval: Atlas Vector Search
// ($vectorSearch, semantic) fused with Atlas full-text search ($search, BM25/lexical)
// via Reciprocal Rank Fusion, plus a region-aware boost. Pure vector alone fuzzed on
// keyword-y queries (it dropped a region's "etiquette" chunk when every region had
// one); the lexical arm + region filter fix that recall miss. Degrades gracefully to
// vector-only if the text index isn't queryable yet (each arm is independently
// optional). ai/concierge.js exposes this as the search_knowledge tool.

export const KNOWLEDGE_VECTOR_INDEX = "knowledge_vector_index";
export const KNOWLEDGE_TEXT_INDEX = "knowledge_text_index";

const rawCollection = () =>
  mongoose.connection.db.collection(KnowledgeArticle.collection.collectionName);

const PROJECT = { _id: 1, title: 1, body: 1, category: 1, sourceTitle: 1, region: 1, tourRefs: 1 };

// Ensure the Atlas Vector Search index exists, then wait until it's queryable.
// Idempotent, the seeds call this every run. numDimensions MUST match the embedding
// dim; category and region are filter fields so retrieval can pre-filter on them.
export const ensureVectorIndex = async () => {
  const col = rawCollection();
  const existing = await col.listSearchIndexes(KNOWLEDGE_VECTOR_INDEX).toArray().catch(() => []);
  if (!existing.length) {
    await col.createSearchIndex({
      name: KNOWLEDGE_VECTOR_INDEX,
      type: "vectorSearch",
      definition: {
        fields: [
          { type: "vector", path: "embedding", numDimensions: EMBED_DIM, similarity: "cosine" },
          { type: "filter", path: "category" },
          { type: "filter", path: "region" },
        ],
      },
    });
  }
  for (let i = 0; i < 60; i++) {
    const [idx] = await col.listSearchIndexes(KNOWLEDGE_VECTOR_INDEX).toArray();
    if (idx && (idx.queryable || idx.status === "READY")) return true;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
};

// Ensure the Atlas full-text (Lucene/BM25) index for the lexical arm of hybrid
// retrieval. title/body are full-text; category/region are tokens so $search can
// filter on them. Idempotent; polls until queryable.
export const ensureTextIndex = async () => {
  const col = rawCollection();
  const existing = await col.listSearchIndexes(KNOWLEDGE_TEXT_INDEX).toArray().catch(() => []);
  if (!existing.length) {
    await col.createSearchIndex({
      name: KNOWLEDGE_TEXT_INDEX,
      type: "search",
      definition: {
        mappings: {
          dynamic: false,
          fields: {
            title: { type: "string" },
            body: { type: "string" },
            category: { type: "token" },
            region: { type: "token" },
          },
        },
      },
    });
  }
  for (let i = 0; i < 60; i++) {
    const [idx] = await col.listSearchIndexes(KNOWLEDGE_TEXT_INDEX).toArray();
    if (idx && (idx.queryable || idx.status === "READY")) return true;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
};

// Provision both knowledge indexes (vector + text). Seeds call this.
export const ensureKnowledgeIndexes = async () => {
  const v = await ensureVectorIndex();
  const t = await ensureTextIndex().catch(() => false);
  return { vector: v, text: t };
};

// Region detection (for the region-aware boost)
// Coarse, conservative slug detection from the query text, places map to the
// region they belong to. Used only to ADD a region-filtered candidate list to the
// fusion (a soft boost), never to hard-filter, so a wrong guess can't drop recall.
const REGION_ALIASES = {
  "north-india": ["north india", "delhi", "agra", "varanasi", "golden triangle"],
  rajasthan: ["rajasthan", "jaipur", "udaipur", "jodhpur", "jaisalmer", "pushkar"],
  "south-india": ["south india", "south indian", "kerala", "tamil nadu", "karnataka", "backwater"],
  "east-india": ["east india", "kolkata", "odisha"],
  "west-india": ["west india", "gujarat", "goa", "mumbai"],
  "central-india": ["central india", "madhya pradesh", "khajuraho"],
  "north-east-india": ["north-east", "north east", "northeast", "ne india", "arunachal", "nagaland", "sikkim", "meghalaya", "assam"],
  "leh-ladakh": ["ladakh", "leh", "nubra", "pangong", "tso moriri"],
};
export const detectRegion = (query = "") => {
  const q = String(query).toLowerCase();
  for (const [slug, aliases] of Object.entries(REGION_ALIASES)) {
    if (aliases.some((a) => q.includes(a))) return slug;
  }
  return null;
};

// Candidate lists
export const vectorCandidates = async (queryVector, { k, category, region }) => {
  const filter = {};
  if (category) filter.category = category;
  if (region) filter.region = region;
  return rawCollection()
    .aggregate([
      {
        $vectorSearch: {
          index: KNOWLEDGE_VECTOR_INDEX,
          path: "embedding",
          queryVector,
          numCandidates: Math.max(150, k * 15),
          limit: k,
          ...(Object.keys(filter).length ? { filter } : {}),
        },
      },
      { $match: { deleted: { $ne: true } } },
      { $project: { ...PROJECT, score: { $meta: "vectorSearchScore" } } },
    ])
    .toArray();
};

export const textCandidates = async (queryText, { k, category, region }) => {
  const filters = [];
  if (category) filters.push({ equals: { path: "category", value: category } });
  if (region) filters.push({ equals: { path: "region", value: region } });
  const text = { query: String(queryText || ""), path: ["title", "body"] };
  const search = filters.length
    ? { index: KNOWLEDGE_TEXT_INDEX, compound: { must: [{ text }], filter: filters } }
    : { index: KNOWLEDGE_TEXT_INDEX, text };
  return rawCollection()
    .aggregate([
      { $search: search },
      { $limit: k },
      { $match: { deleted: { $ne: true } } },
      { $project: { ...PROJECT, score: { $meta: "searchScore" } } },
    ])
    .toArray();
};

// Reciprocal Rank Fusion, combines several ranked lists by summing 1/(K + rank).
// Rank-based (not score-based), so the incomparable vector cosine and BM25 scales
// don't need normalising. K=60 is the standard damping constant.
const RRF_K = 60;
const fuse = (lists, k) => {
  const score = new Map();
  const doc = new Map();
  for (const list of lists) {
    list.forEach((d, i) => {
      const id = String(d._id);
      score.set(id, (score.get(id) || 0) + 1 / (RRF_K + i + 1));
      if (!doc.has(id)) doc.set(id, d);
    });
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([id, s]) => ({ ...doc.get(id), score: s }));
};

// Retrieve the top-k chunks for a query via hybrid (vector + BM25) RRF, with a
// region-aware boost. Optional category/region pre-filters (from the caller, e.g.
// when the concierge passes them). Returns lightweight chunks + a fused score.
// Hybrid retrieval given an ALREADY-embedded query vector, vector + BM25 fused via
// RRF with the region-aware boost. Split out from retrieveKnowledge so callers that
// already hold the vector (e.g. the retrieval ablation running vector-only AND hybrid
// on one embedding) don't re-embed. Behaviour identical to the old inline body.
export const retrieveFromVector = async (queryVector, query, { k = 6, category, region } = {}) => {
  const over = Math.max(k * 2, 12); // over-fetch each arm, then fuse down to k

  const [vec, txt] = await Promise.all([
    vectorCandidates(queryVector, { k: over, category, region }).catch(() => []),
    textCandidates(query, { k: over, category, region }).catch(() => []),
  ]);
  const lists = [vec, txt];

  // Region-aware boost: if the caller didn't already pin a region but the query
  // clearly names one, add a region-scoped vector list to the fusion so the right
  // region's chunks rank up (fixes the "etiquette in South India" style miss).
  if (!region) {
    const detected = detectRegion(query);
    if (detected) {
      const boost = await vectorCandidates(queryVector, { k: over, category, region: detected }).catch(() => []);
      if (boost.length) lists.push(boost);
    }
  }

  return fuse(lists.filter((l) => l.length), k);
};

// Retrieve the top-k chunks for a query. ai/concierge.js exposes this as the
// search_knowledge tool. VECTOR-ONLY: a 444-query ground-truth-anchored ablation
// (evals/retrievalAblation*.js) showed pure dense retrieval beats equal-weight
// vector+BM25 RRF on EVERY metric on this corpus/workload (hit@8 98.9% vs 96.8%,
// hit@1 80.9% vs 60.4%, MRR 0.885 vs 0.736), RRF fusion demoted the semantically
// correct top hit, and no fusion weighting recovered it. The hybrid path
// (retrieveFromVector, + the BM25/region arms) is kept exported for the ablation and
// as a documented, revertable fallback should a keyword-heavy workload warrant it.
export const retrieveKnowledge = async (query, { k = 6, category, region } = {}) =>
  vectorCandidates(await embedQuery(query), { k, category, region });
