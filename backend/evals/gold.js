import KnowledgeArticle from "../models/KnowledgeArticle.js";
import Tour from "../models/Tour.js";

// Retriever-independent gold evidence for the faithfulness judge.
//
// The judge grades whether an answer's claims are backed by a set of true
// passages. Take those from retrieveKnowledge() and the RAG-vs-stuffing ablation
// ends up grading RAG on its own home turf. So each judged fixture carries a
// hand-vetted selector naming the chunks that legitimately ground a correct
// answer, resolved straight from the DB. No embeddings, no model, no retriever.
// Both arms then get judged against the same fixed key, like the scoped-
// correctness judge and the token cost already are.
//
// Selectors are natural keys, since chunk _ids don't survive a re-seed:
//   { category, region }   exact filters, either or both
//   { tour: "<Tour.title>" }   scope to that journey's tour-info via tourRefs
//   { match: /regex/i }    further filter on title + "\n" + body
// Include every chunk a correct answer could ground in, the entity's own plus any
// general chunk the question drags in (packing, say). Too narrow a key false-flags
// a properly grounded answer as invented.

const PROJECT = "title body category region sourceTitle";

const resolveSelector = async (sel) => {
  const q = {};
  if (sel.category) q.category = sel.category;
  if (sel.region) q.region = sel.region;
  if (sel.tour) {
    const t = await Tour.findOne({ title: sel.tour }, "_id").lean();
    if (!t) return [];
    q.tourRefs = t._id;
  }
  let docs = await KnowledgeArticle.find(q, PROJECT).lean();
  if (sel.match) docs = docs.filter((d) => sel.match.test(`${d.title}\n${d.body}`));
  return docs;
};

// Resolve a case's `gold` selectors to a deduped passage list (order: selector, then
// match order within each). Empty when the case has no gold (honesty / out-of-scope /
// catalogue: the kind rubric grades those on NOT inventing, not on passage support).
export const resolveGold = async (selectors = []) => {
  const out = [], seen = new Set();
  for (const sel of selectors) {
    for (const d of await resolveSelector(sel)) {
      const id = String(d._id);
      if (!seen.has(id)) { seen.add(id); out.push(d); }
    }
  }
  return out;
};

// The evidence the faithfulness judge grades an answer against, for either arm.
export const buildEvidence = (c) => resolveGold(c.gold);

// Fail loudly if a gold selector matches nothing (corpus edited/re-seeded out from
// under the fixtures), otherwise we'd silently grade against an empty key.
export const assertGoldResolves = async (cases) => {
  const problems = [];
  for (const c of cases) {
    for (const sel of c.gold ?? []) {
      const docs = await resolveSelector(sel);
      if (!docs.length) {
        const printable = { ...sel, ...(sel.match ? { match: sel.match.source } : {}) };
        problems.push(`  - "${c.q}"\n      selector ${JSON.stringify(printable)} -> 0 chunks`);
      }
    }
  }
  if (problems.length) throw new Error(`Stale gold selectors (corpus changed?):\n${problems.join("\n")}`);
};
