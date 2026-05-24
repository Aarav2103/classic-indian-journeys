import { genai, isAIConfigured } from "./client.js";

// Embeddings for the RAG concierge. Gemini's free embedding model turns the
// knowledge corpus (FAQs, policies, region/seasonal guides) and the traveller's
// question into vectors; Atlas Vector Search does the nearest-neighbour lookup
// (see ai/retrieve.js). One-time corpus embed at seed; one embed per question.
//
// Free tier: gemini-embedding is 100 RPM / 1000 RPD: the corpus is a few hundred
// chunks, well under the daily cap. AI is opt-in: no key => genai is null => callers
// degrade (the concierge endpoint returns 503, the widget hides).

export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";

// 768 keeps the Atlas vector index small and is ample at this scale. gemini-embedding
// is Matryoshka-trained, so truncating the 3072-dim output to 768 stays high quality.
// The Atlas index's numDimensions MUST equal this, seedKnowledge.js reads it from here.
export const EMBED_DIM = Number(process.env.GEMINI_EMBED_DIM || 768);

// Gemini only L2-normalises the full 3072-dim output; a truncated (768) vector is
// NOT unit length, so we normalise ourselves. Cosine is scale-invariant, but unit
// vectors keep scores clean and let the same vectors work under dotProduct too.
const normalize = (v) => {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum) || 1;
  return v.map((x) => x / norm);
};

// Embed an array of texts -> array of unit vectors, in the same order. taskType
// tunes the model for asymmetric retrieval: RETRIEVAL_DOCUMENT for corpus chunks,
// RETRIEVAL_QUERY for the traveller's question. Batched to stay within payload
// limits; the per-batch order is preserved.
const BATCH = 96;
export const embedTexts = async (texts, taskType = "RETRIEVAL_DOCUMENT") => {
  if (!isAIConfigured()) throw new Error("AI is not configured");
  const inputs = (Array.isArray(texts) ? texts : [texts]).map((t) => String(t ?? ""));
  if (!inputs.length) return [];

  const out = [];
  for (let i = 0; i < inputs.length; i += BATCH) {
    const chunk = inputs.slice(i, i + BATCH);
    const res = await genai.models.embedContent({
      model: EMBED_MODEL,
      contents: chunk,
      config: { outputDimensionality: EMBED_DIM, taskType },
    });
    const embeddings = res.embeddings || [];
    if (embeddings.length !== chunk.length) throw new Error("Embedding count mismatch");
    for (const e of embeddings) out.push(normalize(e.values || []));
  }
  return out;
};

// Embed a single search query (asymmetric retrieval, query-side taskType).
export const embedQuery = async (text) => (await embedTexts([text], "RETRIEVAL_QUERY"))[0];
      