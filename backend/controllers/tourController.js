import mongoose from "mongoose";
import Tour from "../models/Tour.js";
import { getPagination, listResponse } from "../utils/paginate.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { isAIConfigured } from "../ai/client.js";
import { parseSearchIntent, intentToMongoFilter, intentToSort, findTours } from "../ai/search.js";
import { planTrip, planChat } from "../ai/agent.js";
import { classifyIntent } from "../ai/router.js";
import { askConcierge } from "../ai/concierge.js";

// Card projection for the list/grid endpoints (getAllTour / getFeaturedTour /
// getToursByRegion). Returns exactly what TourCard + the listing page render and
// nothing they don't, dropping the per-tour heavy fields that only the DETAIL
// page needs (itinerary, overview, highlights, bestMonths, tags, and all of
// reviewInsights except the `aspects` the "Praised for..." chip reads). A load test
// against prod showed the catalogue endpoints saturating at ~29 req/s because each
// returned FULL tour docs (~235KB total); this trims the payload ~90%.
const LIST_FIELDS = "title city photo price avgRating reviewCount duration maxGroupSize featured desc region reviewInsights.aspects";

// Create new tour
export const createTour = async (req, res) => {
  try {
    const newTour = new Tour(req.body);
    const savedTour = await newTour.save();
    res.status(201).json({
      success: true,
      message: "Successfully created",
      data: savedTour,
    });
  } catch (err) {
    console.error("Create Tour Error:", err);
    res.status(500).json({ success: false, message: "Failed to create tour" });
  }
};

// Update tour
export const updateTour = async (req, res) => {
  try {
    const updatedTour = await Tour.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updatedTour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }
    res.status(200).json({
      success: true,
      message: "Tour updated successfully",
      data: updatedTour,
    });
  } catch (err) {
    console.error("Update Tour Error:", err);
    res.status(500).json({ success: false, message: "Failed to update tour" });
  }
};

// Delete tour, SOFT delete (moves to Trash; restorable). The Tour stays in the
// DB with deleted:true and is filtered out of every normal query by the plugin.
export const deleteTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }
    await tour.softDelete();
    res.status(200).json({ success: true, message: "Tour moved to Trash" });
  } catch (err) {
    console.error("Delete Tour Error:", err);
    res.status(500).json({ success: false, message: "Failed to delete tour" });
  }
};

// Get single tour
export const getSingleTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }
    res.status(200).json({
      success: true,
      message: "Tour retrieved successfully",
      data: tour,
    });
  } catch (err) {
    console.error("Get Single Tour Error:", err);
    res.status(500).json({ success: false, message: "Failed to get the tour" });
  }
};

// Get all tours, supports opt-in ?page&limit
export const getAllTour = async (req, res) => {
  try {
    const pg = getPagination(req);
    let query = Tour.find().select(LIST_FIELDS).sort({ createdAt: -1 });
    if (pg) query = query.skip(pg.skip).limit(pg.limit);
    const tours = await query;
    const total = pg ? await Tour.countDocuments() : tours.length;
    res.status(200).json(listResponse(tours, pg, total));
  } catch (err) {
    console.error("Get All Tours Error:", err);
    res.status(500).json({ success: false, message: "Failed to get tours" });
  }
};

// Get featured tours
export const getFeaturedTour = async (req, res) => {
  try {
    const tours = await Tour.find({ featured: true }).select(LIST_FIELDS);
    res.status(200).json({
      success: true,
      message: "Featured tours retrieved successfully",
      data: tours,
    });
  } catch (err) {
    console.error("Get Featured Tours Error:", err);
    res.status(500).json({ success: false, message: "Failed to get featured tours" });
  }
};

// Get tours by region
export const getToursByRegion = async (req, res) => {
  try {
    const slug = req.params.region;
    if (!slug || slug === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing region parameter",
      });
    }

    const regex = new RegExp(`^${escapeRegex(slug)}$`, "i");
    const tours = await Tour.find({ region: regex }).select(LIST_FIELDS);

    // Empty result is a valid 200 (consistent with getAllTour), not a 404.
    res.status(200).json({
      success: true,
      count: tours.length,
      message: `Tours for region: ${slug}`,
      data: tours,
    });
  } catch (err) {
    console.error("Get Tours By Region Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch tours by region" });
  }
};

// Cheap availability probe for AI features (no LLM call). The concierge widget
// GETs this on mount and hides itself when AI is unconfigured, mirroring the
// 503-degrade pattern without spending a generation request to discover it.
export const getAIStatus = (req, res) => {
  res.status(200).json({ success: true, ai: isAIConfigured() });
};

// Get total tour count
export const getTourCount = async (req, res) => {
  try {
    const count = await Tour.estimatedDocumentCount();
    res.status(200).json({
      success: true,
      message: "Total number of tours fetched successfully",
      data: count,
    });
  } catch (err) {
    console.error("Get Tour Count Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch tour count" });
  }
};

// AI natural-language search. Turns a free-text query into a structured,
// validated intent (via Gemini) -> a safe Mongo filter we build ourselves ->
// matching tours, plus the interpreted intent so the UI can show it. 503 when
// AI is unconfigured, 502 on AI failure, both let the client fall back to the
// existing keyword filters.
export const aiSearchTours = async (req, res) => {
  if (!isAIConfigured()) {
    return res.status(503).json({ success: false, message: "AI search is not configured" });
  }
  const { query } = req.body;
  try {
    const intent = await parseSearchIntent(query);
    const filter = intentToMongoFilter(intent);
    const tours = await Tour.find(filter).sort(intentToSort(intent)).limit(60);
    res.status(200).json({
      success: true,
      message: "AI search results",
      query,
      intent,
      count: tours.length,
      data: tours,
    });
  } catch (err) {
    console.error("AI Search Error:", err.message);
    res.status(502).json({ success: false, message: "AI search is temporarily unavailable" });
  }
};

// AI Trip Planner agent. Takes a brief (regions/length/style/group) and runs
// a tool-using agent that searches the REAL catalogue and assembles a grounded
// day-by-day itinerary. Returns the itinerary plus the actual tour documents it
// was built from (for deep-linking). 503 if unconfigured, 502 on failure.
// Resolve an itinerary's basedOnTourIds to real tour docs and prune any ids
// that don't exist (grounding guard). Mutates itinerary.basedOnTourIds.
const resolveItineraryTours = async (itinerary) => {
  const ids = (itinerary.basedOnTourIds || []).filter((id) => mongoose.isValidObjectId(id));
  const tours = ids.length ? await Tour.find({ _id: { $in: ids } }) : [];
  const realIds = new Set(tours.map((t) => String(t._id)));
  itinerary.basedOnTourIds = (itinerary.basedOnTourIds || []).filter((id) => realIds.has(id));
  return tours;
};

export const planJourney = async (req, res) => {
  if (!isAIConfigured()) {
    return res.status(503).json({ success: false, message: "AI planner is not configured" });
  }
  try {
    const itinerary = await planTrip(req.body.brief || {});
    const tours = await resolveItineraryTours(itinerary);
    res.status(200).json({ success: true, message: "Itinerary generated", itinerary, tours });
  } catch (err) {
    console.error("Plan Journey Error:", err.message);
    res.status(502).json({ success: false, message: "The planner is temporarily unavailable" });
  }
};

// Conversational Trip Planner (the chat upgrade). Stateless multi-turn: the
// client sends the short message history + the itinerary currently on screen;
// the agent either replies/clarifies or (re)issues a grounded full plan. When a
// plan comes back we resolve its real tours, same as the one-shot planner.
export const planChatJourney = async (req, res) => {
  if (!isAIConfigured()) {
    return res.status(503).json({ success: false, message: "AI planner is not configured" });
  }
  try {
    const { messages, itinerary } = req.body;
    const result = await planChat({ messages, itinerary });
    const tours = result.itinerary ? await resolveItineraryTours(result.itinerary) : [];
    res.status(200).json({ success: true, reply: result.reply, itinerary: result.itinerary, tours });
  } catch (err) {
    console.error("Plan Chat Error:", err.message);
    res.status(502).json({ success: false, message: "The planner is temporarily unavailable" });
  }
};

// RAG concierge. A conversational, tool-using agent grounded in two paths:
// Atlas Vector Search over the authored knowledge corpus (FAQs/policies/guides) and
// the structured catalogue search. Stateless multi-turn: the client sends the short
// message history; we return the grounded answer, the knowledge chunks that grounded
// it (for citation), and any real journeys it surfaced. 503 unconfigured, 502 on fail.
export const conciergeAsk = async (req, res) => {
  if (!isAIConfigured()) {
    return res.status(503).json({ success: false, message: "AI concierge is not configured" });
  }
  try {
    const { messages } = req.body;
    const { reply, sources, tourIds } = await askConcierge({ messages });
    const ids = (tourIds || []).filter((id) => mongoose.isValidObjectId(id));
    const found = ids.length ? await Tour.find({ _id: { $in: ids } }) : [];
    // Preserve the agent's relevance order (find_tours order), which $in loses.
    const byId = new Map(found.map((t) => [String(t._id), t]));
    const tours = ids.map((id) => byId.get(id)).filter(Boolean);
    res.status(200).json({ success: true, reply, sources, tours });
  } catch (err) {
    console.error("Concierge Error:", err.message);
    res.status(502).json({ success: false, message: "The concierge is temporarily unavailable" });
  }
};

// Smart-box entry point (the single AI search). Routes one free-text query to
// either tour search (mode:"find") or the Trip Planner agent (mode:"plan").
export const aiAssist = async (req, res) => {
  if (!isAIConfigured()) {
    return res.status(503).json({ success: false, message: "AI is not configured" });
  }
  const { query } = req.body;
  try {
    const mode = await classifyIntent(query);
    if (mode === "plan") {
      // Routing only, the dedicated conversational planner (/plan) does the
      // actual planning, so we don't waste a one-shot generation here.
      return res.status(200).json({ success: true, mode: "plan", query });
    }
    const intent = await parseSearchIntent(query);
    const tours = await findTours(intent, 60);
    return res.status(200).json({ success: true, mode: "find", query, intent, count: tours.length, data: tours });
  } catch (err) {
    console.error("AI Assist Error:", err.message);
    res.status(502).json({ success: false, message: "AI is temporarily unavailable" });
  }
};
