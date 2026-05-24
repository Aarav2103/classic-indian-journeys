import express from "express";
import { z } from "zod";
import {
  listKnowledge,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  reembedStale,
} from "../controllers/knowledgeController.js";
import { KNOWLEDGE_CATEGORIES } from "../models/KnowledgeArticle.js";
import verifyToken, { verifyAdmin } from "../utils/verifyToken.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { validateBody } from "../utils/validate.js";

// Knowledge corpus: public read powers the FAQ/Policies/Guides pages and is
// the same content the concierge cites. Admin CRUD lets the owner edit it; the
// controller re-embeds on save so vector search never drifts from the text.
const knowledgeRoute = express.Router();

const knowledgeSchema = z.object({
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(2).max(6000),
  category: z.enum(KNOWLEDGE_CATEGORIES),
  sourceTitle: z.string().trim().max(200).optional().default(""),
  region: z.string().trim().max(80).optional().default(""),
  tourRefs: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(40).optional().default([]),
});

// Public read.
knowledgeRoute.get("/", listKnowledge);

// Admin writes.
knowledgeRoute.post("/", verifyToken, verifyAdmin, validateBody(knowledgeSchema), createKnowledge);
// Admin repair: re-embed chunks whose stored vector drifted from their text.
knowledgeRoute.post("/reembed-stale", verifyToken, verifyAdmin, reembedStale);
knowledgeRoute.put("/:id", verifyToken, verifyAdmin, validateObjectId("id"), validateBody(knowledgeSchema.partial()), updateKnowledge);
knowledgeRoute.delete("/:id", verifyToken, verifyAdmin, validateObjectId("id"), deleteKnowledge);

export default knowledgeRoute;
