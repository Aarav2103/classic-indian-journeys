import { Type } from "@google/genai";
import { generateStructured } from "../ai/structured.js";

// LLM-as-judge grader, the SECOND grading technique in the harness (the others
// are deterministic). It rates whether the concierge's answer is FAITHFUL to the
// passages retrieval surfaced for the question: every policy/price/fact claim must
// be supported, and when the corpus doesn't cover something the answer should
// honestly decline or hedge rather than invent. Reuses the same structured-output
// helper the product features use, so the judge is held to a typed schema too.

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER, description: "Grounding quality, 1 (confident hallucination) to 5 (fully grounded or appropriately declines)." },
    faithful: { type: Type.BOOLEAN, description: "True iff every factual claim is supported by the passages OR the answer honestly hedges/declines when they don't cover it." },
    invented: { type: Type.BOOLEAN, description: "True if the answer asserts a specific policy/price/visa/service fact NOT present in the passages." },
    reason: { type: Type.STRING, description: "One sentence justification." },
  },
  required: ["score", "faithful", "invented", "reason"],
};

// `kind` shapes what "grounded" means for the case so the judge isn't fooled by a
// fluent-but-wrong answer. Honesty/out-of-scope cases are graded on NOT promising
// or NOT inventing, even though no passage "supports" the (correct) refusal.
const kindGuidance = {
  policy: "This is a policy/logistics question. Every concrete claim (deposit %, refund tiers, visa rules, vaccines, what's included) MUST appear in the passages. Unsupported specifics => invented=true, low score.",
  catalogue: "This asks which journeys match criteria. The answer should only name real journeys and must NOT fabricate prices or policies; passages may be sparse, judge that it doesn't invent facts.",
  honesty: "The honest answer must NOT guarantee an outcome that cannot be guaranteed (e.g. a wildlife sighting). A confident guarantee => faithful=false, low score. An honest hedge => high score even with thin passages.",
  "out-of-scope": "We do not offer this. The correct answer declines / says it's outside what the studio offers and doesn't invent an offering. Inventing one => invented=true, score 1. A clean, honest decline => score 5.",
};

const SYSTEM = `You are a STRICT evaluator of an Indian travel studio's AI concierge. You judge ONE thing: factual grounding / faithfulness, not tone or helpfulness.

You receive: the user QUESTION, a KIND hint describing what good grounding means here, the concierge's ANSWER, the retrieved PASSAGES that should support any policy/logistics claim, and the real JOURNEYS the concierge surfaced (which ground any tour name/price/duration/region it mentions).

Rules:
- faithful=true iff every factual claim is grounded: policy/visa/price-of-service claims by the PASSAGES, and tour names/prices/durations by the JOURNEYS list, OR (for honesty/out-of-scope kinds) the answer correctly hedges or declines.
- A tour the concierge names is NOT invented if it appears in the JOURNEYS list, even if it's absent from the passages. Only flag a tour as invented if it is in NEITHER.
- invented=true if the answer states a specific fact found in neither the passages nor the journeys, and it is not an honest hedge.
- score 1-5 as described in the kind hint. Be unforgiving about confident, unsupported specifics.
Return only the JSON.`;

const trim = (s, n) => String(s || "").slice(0, n);

export const judgeGrounding = async ({ question, kind = "policy", answer, passages = [], tours = [] }) => {
  const passageText = passages.length
    ? passages.map((p, i) => `[${i + 1}] (${p.category}${p.region ? `/${p.region}` : ""}) ${p.title}\n${trim(p.body, 600)}`).join("\n\n")
    : "(no passages retrieved)";

  const toursText = tours.length
    ? tours.map((t) => `- ${t.title}, ${t.region}, ${t.durationDays} days, ₹${t.price}`).join("\n")
    : "(no journeys surfaced)";

  const userText = `QUESTION: ${question}
KIND: ${kind}, ${kindGuidance[kind] || kindGuidance.policy}

ANSWER:
${trim(answer, 1500)}

RETRIEVED PASSAGES (ground policy/logistics claims):
${passageText}

JOURNEYS THE CONCIERGE SURFACED (ground any tour name/price/duration it mentions):
${toursText}`;

  return generateStructured({ system: SYSTEM, userText, responseSchema });
};

// Scoped-correctness judge (the sharper quality axis)
// The faithfulness judge above asks "is every claim grounded?", it can PASS an
// answer that is fluently grounded but about the WRONG journey (e.g. a stuffed-
// context model that grabbed a lookalike "what's included" chunk from a different
// tour). This judge asks the orthogonal question: does the answer describe the
// SPECIFIC entity the question named? It's given that entity's real facts + its own
// knowledge-base text as ground truth, and flags wrong-entity / blended answers.
const scopedSchema = {
  type: Type.OBJECT,
  properties: {
    correct: { type: Type.BOOLEAN, description: "True iff the answer accurately describes THE entity named in the question and nothing in it belongs to a different journey/region." },
    confused: { type: Type.BOOLEAN, description: "True if the answer states specifics that match a DIFFERENT journey/region than the one asked about (wrong entity, or two entities blended)." },
    reason: { type: Type.STRING, description: "One sentence: what (if anything) is about the wrong entity." },
  },
  required: ["correct", "confused", "reason"],
};

const SCOPED_SYSTEM = `You verify whether a travel concierge's answer is about the RIGHT entity, not whether it is complete.

You receive: the QUESTION (which names ONE specific journey or region), the ANSWER, and GROUND TRUTH (that entity's real facts and its own knowledge-base text). Decide if the answer describes THAT entity.

Rules:
- confused=true, correct=false if the answer asserts specifics that belong to a DIFFERENT journey/region, e.g. the wrong duration, the wrong region/route, an experience the named journey doesn't include, or it clearly blends two journeys. This is the failure to catch: a fluent answer about the wrong record.
- correct=true if everything entity-specific in the answer is consistent with the GROUND TRUTH. Generic-but-consistent guidance is fine. An honest "let me check" with no wrong specifics is correct, not confused.
- Judge entity IDENTITY strictly; ignore completeness, tone, and minor omissions.
Return only the JSON.`;

export const judgeScopedCorrectness = async ({ question, answer, facts = "", groundTruth = "" }) => {
  const userText = `QUESTION: ${question}

ANSWER:
${trim(answer, 1500)}

GROUND TRUTH: the entity named in the question:
${facts ? `Facts: ${facts}\n` : ""}${trim(groundTruth, 2000) || "(no ground-truth text)"}`;

  return generateStructured({ system: SCOPED_SYSTEM, userText, responseSchema: scopedSchema });
};
