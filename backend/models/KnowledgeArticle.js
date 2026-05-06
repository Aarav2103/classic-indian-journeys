import mongoose from "mongoose";
import softDeletePlugin from "../utils/softDelete.js";

// RAG corpus. ONE document per retrievable chunk, a single FAQ Q&A, a policy
// clause, or one section of a region/seasonal guide, each with a TOP-LEVEL
// `embedding` vector. (Atlas $vectorSearch can't index a vector nested inside an
// array of subdocuments, so the corpus is flattened to chunk-per-document.)
// Authored + embedded by seedKnowledge.js, retrieved by ai/retrieve.js, and
// answered/cited by the concierge agent (ai/concierge.js).

// tour-info = per-journey fine print (inclusions/exclusions/good-to-know), scoped
// to a tour via tourRefs. permit = domestic entry-permit rules (Inner Line / PAP
// for Ladakh & the North-East), scoped by region. Both authored by
// seedTourKnowledge.js, see that script + the RAG-vs-stuffing ablation.
export const KNOWLEDGE_CATEGORIES = ["faq", "policy", "guide", "region-guide", "tour-info", "permit"];

const knowledgeArticleSchema = new mongoose.Schema(
  {
    // Heading for this chunk, the FAQ question, the policy clause name, or a
    // guide section title (e.g. "Kerala, when to go").
    title: { type: String, required: true },
    // The retrievable prose the model reads and grounds its answer in.
    body: { type: String, required: true },
    category: { type: String, enum: KNOWLEDGE_CATEGORIES, required: true, index: true },
    // The parent article this chunk belongs to (groups a multi-section guide so
    // citations can name the source piece, e.g. "Kerala destination guide").
    sourceTitle: { type: String, default: "" },
    sourceType: { type: String, default: "knowledge" },
    // Region slug when the chunk is region-specific (matches Tour.region).
    region: { type: String, default: "", index: true },
    // Real tours this chunk references, so a citation can deep-link to them.
    tourRefs: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tour" }], default: [] },
    // Unit-length embedding of the chunk (length === EMBED_DIM). `select: false`
    // keeps the heavy vector out of normal reads; $vectorSearch (an aggregation)
    // is unaffected and we project the vector away in results anyway.
    embedding: { type: [Number], default: undefined, select: false },
    // Set when a save changed the text but (re)embedding failed or AI was off, so
    // the stored vector no longer matches the body. Surfaces the drift instead of
    // letting it sit silently; cleared by a successful re-embed (POST /reembed-stale).
    needsReembed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

knowledgeArticleSchema.plugin(softDeletePlugin);

export default mongoose.model("KnowledgeArticle", knowledgeArticleSchema);
