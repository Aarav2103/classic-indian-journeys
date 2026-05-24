import KnowledgeArticle from "../models/KnowledgeArticle.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { isAIConfigured } from "../ai/client.js";
import { embedTexts } from "../ai/embeddings.js";

// Public, read-only access to the knowledge corpus, the SAME chunks the RAG
// concierge retrieves and cites. The FAQ, Policies and Guides pages render from
// this, so the site content and the concierge can never drift apart. The heavy
// `embedding` vector is `select:false` on the model, so it's never sent here.
//
// Returned in insertion order (`_id` asc), the seed authored sections in their
// intended reading order (e.g. a guide's "When to go" before "Getting around").
export const listKnowledge = async (req, res) => {
  try {
    const { category, region, tour } = req.query;
    const filter = {};
    if (category) filter.category = String(category);
    if (region) filter.region = new RegExp(`^${escapeRegex(String(region))}$`, "i");
    // A journey's fine print (tour-info) and its region permits are scoped via
    // tourRefs, TourDetails fetches them with ?tour=<id>. Guard the id format so
    // a bad value can't trigger an ObjectId cast error (it just matches nothing).
    if (tour && /^[a-f\d]{24}$/i.test(String(tour))) filter.tourRefs = String(tour);

    const data = await KnowledgeArticle.find(filter).sort({ _id: 1 }).lean();
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("List Knowledge Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to load knowledge" });
  }
};

// Admin CRUD
// Lets the owner edit the FAQs / policies / guides the site shows AND the RAG
// concierge cites. The catch with hand-edited corpus is the embedding: a chunk's
// vector must reflect its current text or vector search drifts. So we RE-EMBED on
// any title/body change (best-effort, if AI is unconfigured we save without a
// vector and the chunk simply won't be retrieved until re-embedded by the seed).
// Retry transient rate-limit/overload errors, the live admin path lacked the
// backoff the seed scripts have, so a momentary 429 used to drop the re-embed.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withRetry = async (fn, tries = 4) => {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.status || err?.code;
      const retryable = status === 503 || status === 429 || status === 500;
      if (!retryable || i === tries - 1) throw err;
      await sleep(Math.min(8000, 1000 * 2 ** i));
    }
  }
};
const embedChunk = async (title, body) => {
  if (!isAIConfigured()) return undefined;
  const [vec] = await withRetry(() => embedTexts([`${title}\n\n${body}`])); // RETRIEVAL_DOCUMENT
  return vec;
};

export const createKnowledge = async (req, res) => {
  try {
    const { title, body, category, sourceTitle = "", region = "", tourRefs = [] } = req.body;
    let embedding;
    let needsReembed = false;
    try {
      embedding = await embedChunk(title, body);
      needsReembed = !embedding; // AI off -> saved without a vector; flag for repair
    } catch (e) {
      console.error("Knowledge embed failed (saving without vector):", e.message);
      needsReembed = true;
    }
    const doc = await KnowledgeArticle.create({ title, body, category, sourceTitle, region, tourRefs, sourceType: "knowledge", embedding, needsReembed });
    res.status(201).json({ success: true, message: "Article created", data: { ...doc.toObject(), embedding: undefined } });
  } catch (err) {
    console.error("Create Knowledge Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to create article" });
  }
};

export const updateKnowledge = async (req, res) => {
  try {
    const doc = await KnowledgeArticle.findById(req.params.id).select("+embedding");
    if (!doc) return res.status(404).json({ success: false, message: "Article not found" });

    const before = `${doc.title}\n\n${doc.body}`;
    const fields = ["title", "body", "category", "sourceTitle", "region", "tourRefs"];
    for (const f of fields) if (req.body[f] !== undefined) doc[f] = req.body[f];

    // Re-embed only when the retrievable text actually changed.
    if (`${doc.title}\n\n${doc.body}` !== before) {
      try {
        const vec = await embedChunk(doc.title, doc.body);
        if (vec) {
          doc.embedding = vec;
          doc.needsReembed = false;
        } else {
          doc.needsReembed = true; // AI off, text now diverges from the old vector
        }
      } catch (e) {
        console.error("Knowledge re-embed failed (keeping old vector):", e.message);
        doc.needsReembed = true;
      }
    }
    await doc.save();
    res.status(200).json({ success: true, message: "Article updated", data: { ...doc.toObject(), embedding: undefined } });
  } catch (err) {
    console.error("Update Knowledge Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to update article" });
  }
};

export const deleteKnowledge = async (req, res) => {
  try {
    const doc = await KnowledgeArticle.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Article not found" });
    await doc.softDelete(); // restorable from Trash
    res.status(200).json({ success: true, message: "Article moved to Trash" });
  } catch (err) {
    console.error("Delete Knowledge Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete article" });
  }
};

// Repair stale embeddings: re-embed every chunk flagged `needsReembed` (an earlier
// save changed the text but embedding failed / AI was off). Re-embeds the EXISTING
// text only, it never regenerates content, so it's the safe fix that
// seedKnowledge.js --force can't be (that wipes + re-authors the whole corpus,
// clobbering admin edits). Trashed chunks are excluded by the soft-delete filter.
export const reembedStale = async (req, res) => {
  if (!isAIConfigured()) {
    return res.status(503).json({ success: false, message: "AI is not configured" });
  }
  try {
    const docs = await KnowledgeArticle.find({ needsReembed: true }).select("+embedding");
    let fixed = 0;
    const failed = [];
    for (const doc of docs) {
      try {
        const vec = await embedChunk(doc.title, doc.body);
        if (!vec) { failed.push(String(doc._id)); continue; }
        doc.embedding = vec;
        doc.needsReembed = false;
        await doc.save();
        fixed++;
      } catch (e) {
        console.error("Re-embed failed for", String(doc._id), e.message);
        failed.push(String(doc._id));
      }
    }
    res.status(200).json({
      success: true,
      message: `Re-embedded ${fixed} chunk(s)${failed.length ? `, ${failed.length} still failing` : ""}`,
      fixed,
      remaining: failed.length,
    });
  } catch (err) {
    console.error("Re-embed Stale Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to re-embed" });
  }
};
