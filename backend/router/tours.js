import express from "express";
import { z } from "zod";
import { validateBody } from "../utils/validate.js";
import {
  aiSearchTours,
  aiAssist,
  planJourney,
  planChatJourney,
  conciergeAsk,
  createTour,
  deleteTour,
  getAllTour,
  getFeaturedTour,
  getSingleTour,
  getTourCount,
  getToursByRegion,
  getAIStatus,
  updateTour,
} from "../controllers/tourController.js";
import verifyToken, { verifyAdmin } from "../utils/verifyToken.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { aiLimiter } from "../utils/rateLimiters.js";

const tourRoute = express.Router();

const tourSchema = z.object({
  title: z.string().min(1).max(200),
  city: z.string().min(1).max(120),
  address: z.string().min(1).max(300),
  region: z.string().min(1).max(80),
  distance: z.coerce.number().min(0),
  duration: z.coerce.number().int().min(1).optional(),
  maxGroupSize: z.coerce.number().int().min(1),
  price: z.coerce.number().min(0),
  photo: z.string().min(1).max(2000),
  desc: z.string().min(1),
  featured: z.boolean().optional(),
  // Rich, editable content (also produced by seedTourContent.js). Optional so the
  // admin can save core fields alone, but fully editable in the journey editor.
  overview: z.string().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(24).optional(),
  highlights: z.array(z.string().trim().min(1).max(240)).max(12).optional(),
  bestMonths: z.array(z.string().trim().min(1).max(20)).max(12).optional(),
  itinerary: z
    .array(
      z.object({
        day: z.coerce.number().int().min(1).max(60),
        title: z.string().trim().max(200).optional().default(""),
        detail: z.string().trim().max(2000).optional().default(""),
      })
    )
    .max(60)
    .optional(),
});

// Admin-only routes
tourRoute.post("/", verifyToken, verifyAdmin, validateBody(tourSchema), createTour);
tourRoute.put("/:id", verifyToken, verifyAdmin, validateObjectId("id"), validateBody(tourSchema.partial()), updateTour);
tourRoute.delete("/:id", verifyToken, verifyAdmin, validateObjectId("id"), deleteTour);

// AI natural-language search (public, AI-rate-limited). POST so the query isn't
// logged in URLs. Net-new: the site otherwise has no search endpoint.
const searchQuerySchema = z.object({ query: z.string().trim().min(2).max(300) });
tourRoute.post("/search", aiLimiter, validateBody(searchQuerySchema), aiSearchTours);

// Smart box, one free-text query, auto-routed to search or planning.
tourRoute.post("/assist", aiLimiter, validateBody(searchQuerySchema), aiAssist);

// AI Trip Planner agent, takes a brief, returns a grounded itinerary.
const planSchema = z.object({
  brief: z
    .object({
      request: z.string().max(500).optional(),
      regions: z.array(z.string().max(40)).max(8).optional().default([]),
      days: z.coerce.number().int().min(1).max(60).optional(),
      style: z.string().max(40).optional(),
      group: z.string().max(40).optional(),
      notes: z.string().max(500).optional(),
      refine: z.string().max(200).optional(),
    })
    .optional()
    .default({}),
});
tourRoute.post("/plan", aiLimiter, validateBody(planSchema), planJourney);

// Conversational planner, multi-turn chat. The client sends the message history
// and the itinerary currently on screen; the agent clarifies or (re)issues a plan.
const planChatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(24),
  // The plan currently on screen, sent back for grounding refinements. It's our
  // own output round-tripped; the agent trims it to known fields before use.
  itinerary: z.any().optional(),
});
tourRoute.post("/plan/chat", aiLimiter, validateBody(planChatSchema), planChatJourney);

// RAG concierge, multi-turn Q&A grounded in the knowledge corpus (Atlas Vector
// Search) + the structured catalogue. The client sends the short message history.
const askSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(24),
});
tourRoute.post("/ask", aiLimiter, validateBody(askSchema), conciergeAsk);

// Specific routes (put these BEFORE /:id)
tourRoute.get("/featured", getFeaturedTour);
tourRoute.get("/region/:region", getToursByRegion);
tourRoute.get("/count", getTourCount);
tourRoute.get("/ai-status", getAIStatus);

// Generic route - keep this LAST
tourRoute.get("/:id", validateObjectId("id"), getSingleTour);

// General tours (no params)
tourRoute.get("/", getAllTour);

export default tourRoute;
