// Deterministic scorers for the AI eval harness, pure functions, no AI calls.
// These grade the structured/classification/retrieval tasks against the labeled
// fixtures in datasets.js. (The fuzzy task, concierge faithfulness, is graded
// by the separate LLM-as-judge in judge.js; running BOTH techniques is the point.)

export const mean = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
export const pct = (x) => `${Math.round(x * 100)}%`;

// Search intent (structured output)

// A predicted keyword "covers" an expected one if either contains the other
// (case-insensitive), so "backwaters"~"backwater", "temples"~"temple", and a
// place keyword the model adds doesn't break a theme assertion.
const covers = (expected, predicted) => {
  const e = String(expected).toLowerCase();
  return predicted.some((p) => {
    const x = String(p).toLowerCase();
    return x === e || x.includes(e) || e.includes(x);
  });
};

// Keyword set scoring. Recall = did we capture the themes we asked for (the
// headline, themes are the main search signal); precision = of what we emitted,
// how much was on-target. Extra valid place words make precision imperfect by
// design, so we threshold on recall and report precision/F1 for context.
export const keywordScore = (expected = [], predicted = []) => {
  if (!expected.length) return { recall: 1, precision: 1, f1: 1, matched: 0 };
  const matchedExpected = expected.filter((e) => covers(e, predicted)).length;
  const matchedPredicted = predicted.filter((p) => covers(p, expected)).length;
  const recall = matchedExpected / expected.length;
  const precision = predicted.length ? matchedPredicted / predicted.length : 1;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { recall, precision, f1, matched: matchedExpected };
};

// Match a predicted scalar against an expected assertion. The expected value is
// either a literal (exact match) or a small range object: {between:[lo,hi]},
// {atMost:n}, {atLeast:n}, needed because "around 2 weeks" legitimately maps to
// a duration RANGE, not one number.
export const matchValue = (pred, exp) => {
  if (exp && typeof exp === "object" && !Array.isArray(exp)) {
    if (pred == null) return false;
    if (Array.isArray(exp.between)) return pred >= exp.between[0] && pred <= exp.between[1];
    if (exp.atMost != null) return pred <= exp.atMost;
    if (exp.atLeast != null) return pred >= exp.atLeast;
    return false;
  }
  if (typeof exp === "string") return String(pred ?? "").toLowerCase() === exp.toLowerCase();
  return pred === exp;
};

// Grade one search case. `expect` only asserts the fields that matter for the
// case; everything else is ignored (the model may legitimately set extra fields).
// A case passes when every asserted scalar is correct AND all expected themes
// were captured (keyword recall === 1).
export const scoreIntent = (pred = {}, expect = {}) => {
  const fields = [];
  for (const [field, exp] of Object.entries(expect)) {
    if (field === "keywords") continue;
    const ok = matchValue(pred[field], exp);
    fields.push({ field, ok, pred: pred[field] ?? null, exp });
  }
  const kw = expect.keywords ? keywordScore(expect.keywords, pred.keywords || []) : null;
  const scalarsOk = fields.every((f) => f.ok);
  const keywordsOk = !kw || kw.recall === 1;
  return { fields, keywords: kw, pass: scalarsOk && keywordsOk };
};

// Retrieval (RAG recall)

// 1-based rank of the first retrieved chunk satisfying `predicate`, or 0 if none
// of the top-k match. Drives hit@k (rank > 0) and reciprocal rank (1/rank).
export const firstMatchRank = (hits = [], predicate) => {
  for (let i = 0; i < hits.length; i++) if (predicate(hits[i])) return i + 1;
  return 0;
};

// Build a hit predicate from a retrieval case spec: optional category (string or
// list), optional region slug, and an optional regex that must appear in the
// chunk's title+body.
export const retrievalPredicate = ({ category, region, match }) => (hit) => {
  if (category) {
    const cats = Array.isArray(category) ? category : [category];
    if (!cats.includes(hit.category)) return false;
  }
  if (region && hit.region !== region) return false;
  if (match && !match.test(`${hit.title || ""} ${hit.body || ""}`)) return false;
  return true;
};
