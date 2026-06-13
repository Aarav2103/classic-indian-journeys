// Labeled fixtures for the AI eval harness. Each case states only what MUST hold
// for that input, assertions are partial on purpose (the model may set extra,
// still-correct fields). Grounded in the real catalogue (regions/price bands) and
// the authored knowledge corpus (seedKnowledge.js topics), so expectations are
// achievable, not aspirational.

// S1 NL->Mongo search: query -> asserted intent fields
// Scalars are exact unless given as a range ({between},{atMost},{atLeast});
// `keywords` is a "must capture these themes" set (fuzzy, substring-tolerant).
export const searchCases = [
  { q: "wildlife tours under 2 lakh", expect: { priceMax: 200000, keywords: ["wildlife"] } },
  { q: "tiger safaris", expect: { keywords: ["tiger", "safari"] } },
  { q: "beach honeymoon under 1.2 lakh", expect: { priceMax: 120000, keywords: ["beach", "honeymoon"] } },
  { q: "cheapest rajasthan heritage trips", expect: { region: "rajasthan", sort: "price-asc", keywords: ["heritage"] } },
  { q: "10 day temple tour of south india", expect: { region: "south-india", durationMax: { between: [9, 13] }, keywords: ["temple"] } },
  { q: "most luxurious, expensive journeys", expect: { sort: "price-desc" } },
  { q: "best rated trips in kerala", expect: { sort: "rating", keywords: ["kerala"] } },
  { q: "backwater cruises under 90k", expect: { priceMax: 90000, keywords: ["backwater"] } },
  { q: "desert safari in rajasthan for a family of 6", expect: { region: "rajasthan", minGroupSize: { atLeast: 6 }, keywords: ["desert"] } },
  { q: "journeys over 2 lakh", expect: { priceMin: 200000 } },
  { q: "a week-long himalayan trek", expect: { durationMax: { between: [5, 9] }, keywords: ["trek"] } },
  { q: "spiritual tours in north india", expect: { region: "north-india", keywords: ["spiritual"] } },
];

// Router: smart-box message -> intent ("find" | "plan")
export const routerCases = [
  { q: "show me wildlife tours in rajasthan", expect: "find" },
  { q: "tours under 1 lakh", expect: "find" },
  { q: "cheapest kerala trips", expect: "find" },
  { q: "best rated heritage journeys", expect: "find" },
  { q: "tiger safaris in central india", expect: "find" },
  { q: "do you have backwater cruises", expect: "find" },
  { q: "plan me a 10 day family trip through south india", expect: "plan" },
  { q: "build a two week honeymoon itinerary across rajasthan and kerala", expect: "plan" },
  { q: "I have 8 days, want heritage and food, budget 80k, what would you do", expect: "plan" },
  { q: "make me an itinerary for a week in ladakh", expect: "plan" },
  { q: "stitch together the golden triangle plus varanasi over 9 days", expect: "plan" },
];

// S3 retrieval: question -> predicate a top-k chunk must satisfy
// `match` is a regex over (title + body). Topics mirror the authored corpus
// (FAQs, policies, region & seasonal guides), so a correct retriever finds them.
export const retrievalCases = [
  { q: "how much deposit is needed to confirm a booking?", expect: { category: "policy", match: /deposit|confirm|booking|balance/i } },
  { q: "what is your cancellation and refund policy?", expect: { category: "policy", match: /cancel|refund/i } },
  { q: "what ID or travel permits do I need within India?", expect: { match: /permit|identification|inner line|photo id/i } },
  { q: "when is the best time to see tigers in India?", expect: { match: /tiger|wildlife|safari/i } },
  { q: "tell me about travelling in Kerala and its backwaters", expect: { match: /kerala|backwater/i } },
  { q: "what's included and excluded in the price?", expect: { match: /includ|exclud/i } },
  { q: "is the tap water safe to drink in India?", expect: { category: "faq", match: /water|food|health/i } },
  { q: "how should I plan a honeymoon in India?", expect: { match: /honeymoon/i } },
  { q: "are your journeys suitable for families with children?", expect: { match: /family|families|children|child/i } },
  { q: "what should I pack for a trip across India?", expect: { category: "faq", match: /pack|cloth|layer/i } },
];

// Concierge faithfulness (LLM-as-judge): question -> expectation
// `expectSources`/`expectTours` are cheap deterministic pre-checks; `kind` tells
// the judge what good grounding looks like (e.g. honesty cases must NOT promise).
// `gold` (see evals/gold.js) is the retriever-INDEPENDENT evidence the faithfulness
// judge grades against, hand-vetted corpus chunks, so we never grade RAG against
// its own retriever. Honesty/out-of-scope/catalogue cases carry no gold: their kind
// rubric grades on NOT inventing an answer, not on passage support.
export const conciergeCases = [
  { q: "What is your cancellation policy if I cancel a month before departure?", kind: "policy", expectSources: true,
    gold: [{ category: "policy", match: /cancellation and refunds/i }, { category: "faq", match: /cancellation and refund policy in brief/i }] },
  { q: "What health precautions should I take while travelling in India?", kind: "policy", expectSources: true,
    // A complete, grounded health answer legitimately touches food/water, high-altitude
    // care, and the (required) medical-evacuation insurance, include all so the judge
    // doesn't false-flag a correct answer that mentions any of them.
    gold: [
      { category: "faq", match: /health precautions should i take/i },
      { category: "faq", match: /tap water safe/i },
      { category: "faq", match: /health and safety when travelling to high-altitude/i },
      { category: "faq", match: /is travel insurance required/i },
      { category: "policy", match: /require all guests to hold valid travel insurance/i },
    ] },
  { q: "Which journeys take in Kerala's backwaters for under ₹1,50,000 per person?", kind: "catalogue", expectTours: true },
  { q: "Can you guarantee we'll see a wild tiger on a safari?", kind: "honesty" },
  { q: "Do you sell guided cruises to Antarctica?", kind: "out-of-scope" },
];

// Ablation (RAG vs full-context stuffing): scoped, per-journey questions
// These deliberately target the Track-B tour-info/permit corpus, the content where
// retrieval must pick the RIGHT journey's chunk and full-context stuffing risks
// blending 42 lookalike "what's included / good to know" chunks. Combined with the
// conciergeCases so the ablation measures BOTH general and scoped grounding. Uses
// real tour names so a correct, grounded answer is achievable.
// `scope` names the ground-truth entity for the scoped-correctness judge (did the
// answer describe the RIGHT journey/region?). tour = exact Tour.title; region = slug.
export const ablationScopedCases = [
  { q: "How fit do I need to be for the Trans Himalaya journey, and who is it best suited to?", kind: "policy", expectSources: true, scope: { tour: "Trans Himalaya" },
    gold: [{ category: "tour-info", tour: "Trans Himalaya" }] },
  { q: "What exactly is included in the price of the Amazing Ladakh trip?", kind: "policy", expectSources: true, scope: { tour: "Amazing Ladakh" },
    gold: [{ category: "tour-info", tour: "Amazing Ladakh" }] },
  { q: "What should I pack, and what is the best season, for the Trans Himalaya trip?", kind: "policy", expectSources: true, scope: { tour: "Trans Himalaya" },
    gold: [{ category: "tour-info", tour: "Trans Himalaya" }, { category: "faq", match: /what should i pack/i }, { category: "faq", match: /best time of year to visit/i }] },
  { q: "Do I need an Inner Line Permit for Nubra Valley and Pangong on a Ladakh journey?", kind: "policy", expectSources: true, scope: { region: "leh-ladakh" },
    gold: [{ category: "permit", region: "leh-ladakh" }] },
  { q: "What travel permits do I need for the North-East, and do you arrange them?", kind: "policy", expectSources: true, scope: { region: "north-east-india" },
    gold: [{ category: "permit", region: "north-east-india" }] },
  { q: "Which festivals should I time a Rajasthan journey around, and when should I come?", kind: "policy", expectSources: true, scope: { region: "rajasthan" },
    gold: [{ category: "region-guide", region: "rajasthan" }] },
  { q: "What should I know about temple etiquette and local customs in South India?", kind: "policy", expectSources: true, scope: { region: "south-india" },
    gold: [{ category: "region-guide", region: "south-india" }] },
];

// What the ablation task actually runs: general + scoped grounding side by side.
export const ablationCases = [...conciergeCases, ...ablationScopedCases];
