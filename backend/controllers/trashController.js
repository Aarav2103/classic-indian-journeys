import Tour from "../models/Tour.js";
import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Contact from "../models/Contact.js";
import KnowledgeArticle from "../models/KnowledgeArticle.js";
import { recomputeTourRating } from "./reviewController.js";
import { refreshTourInsights } from "../ai/reviews.js";
import { isAIConfigured } from "../ai/client.js";

// Trash, the recovery surface for soft-deleted records. Every admin "delete"
// flips a `deleted` flag (see utils/softDelete.js); this controller lists what's
// in the bin and lets an admin RESTORE it or permanently PURGE it. One generic
// endpoint set over a small registry keeps it DRY across resource types.

const trim = (s, n = 80) => (s ? String(s).slice(0, n) : "");

// type -> { model, label } where label maps a trashed doc to a uniform row the
// Trash UI renders. `select` keeps the list query light.
const REGISTRY = {
  tours: {
    model: Tour,
    select: "title region price deletedAt",
    label: (d) => ({ title: d.title, subtitle: [d.region, d.price ? `₹${d.price.toLocaleString("en-IN")}` : null].filter(Boolean).join(" · ") }),
  },
  reviews: {
    model: Review,
    select: "username rating reviewText tour deletedAt",
    label: (d) => ({ title: `${d.rating}★: ${d.username}`, subtitle: trim(d.reviewText, 90) }),
  },
  bookings: {
    model: Booking,
    select: "fullName tourName groupSize deletedAt",
    label: (d) => ({ title: d.fullName, subtitle: [d.tourName, d.groupSize ? `${d.groupSize} pax` : null].filter(Boolean).join(" · ") }),
  },
  users: {
    model: User,
    select: "username email role deletedAt",
    label: (d) => ({ title: d.username, subtitle: d.email }),
  },
  enquiries: {
    model: Contact,
    select: "name email deletedAt",
    label: (d) => ({ title: d.name, subtitle: d.email }),
  },
  knowledge: {
    model: KnowledgeArticle,
    select: "title category region deletedAt",
    label: (d) => ({ title: d.title, subtitle: [d.category, d.region].filter(Boolean).join(" · ") }),
  },
};

export const TRASH_TYPES = Object.keys(REGISTRY);

// GET /trash, all trashed records, grouped by type, in a uniform shape.
export const listTrash = async (req, res) => {
  try {
    const out = {};
    for (const [type, cfg] of Object.entries(REGISTRY)) {
      const docs = await cfg.model
        .find({ deleted: true }) // explicit `deleted` => soft-delete hook steps aside
        .select(cfg.select)
        .sort({ deletedAt: -1 })
        .limit(200)
        .lean();
      out[type] = docs.map((d) => ({ _id: d._id, type, deletedAt: d.deletedAt, ...cfg.label(d) }));
    }
    const total = Object.values(out).reduce((n, arr) => n + arr.length, 0);
    res.status(200).json({ success: true, total, data: out });
  } catch (err) {
    console.error("List Trash Error:", err);
    res.status(500).json({ success: false, message: "Failed to load trash" });
  }
};

// PATCH /trash/:type/:id/restore, bring a record back.
export const restoreTrash = async (req, res) => {
  const cfg = REGISTRY[req.params.type];
  if (!cfg) return res.status(400).json({ success: false, message: "Unknown trash type" });
  try {
    const doc = await cfg.model.restoreById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Item not found in Trash" });

    // Restoring a review changes a tour's rating/insights, recompute them.
    if (req.params.type === "reviews" && doc.tour) {
      await recomputeTourRating(doc.tour);
      if (isAIConfigured()) refreshTourInsights(doc.tour).catch(() => {});
    }
    res.status(200).json({ success: true, message: "Restored" });
  } catch (err) {
    console.error("Restore Trash Error:", err);
    res.status(500).json({ success: false, message: "Failed to restore item" });
  }
};

// DELETE /trash/:type/:id, permanent, irreversible removal from the DB.
export const purgeTrash = async (req, res) => {
  const cfg = REGISTRY[req.params.type];
  if (!cfg) return res.status(400).json({ success: false, message: "Unknown trash type" });
  try {
    const result = await cfg.model.purgeById(req.params.id);
    if (!result.deletedCount) return res.status(404).json({ success: false, message: "Item not found in Trash" });
    res.status(200).json({ success: true, message: "Deleted permanently" });
  } catch (err) {
    console.error("Purge Trash Error:", err);
    res.status(500).json({ success: false, message: "Failed to delete item" });
  }
};
