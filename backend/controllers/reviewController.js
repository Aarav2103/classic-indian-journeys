import mongoose from "mongoose";
import Review from "../models/Review.js";
import Tour from "../models/Tour.js";
import { getPagination, listResponse } from "../utils/paginate.js";
import { isAIConfigured } from "../ai/client.js";
import { refreshTourInsights } from "../ai/reviews.js";

// Recompute the tour's cached review-intelligence aggregate after the review
// set changes. Fire-and-forget: it makes one Gemini call, so we never block the
// HTTP response on it, and it no-ops gracefully when AI is unconfigured. The
// batch script (seedReviewInsights.js) remains the bulk source of truth.
const refreshInsightsAsync = (tourId) => {
  if (!isAIConfigured()) return;
  refreshTourInsights(tourId).catch((err) =>
    console.error("Review insights refresh failed:", err?.message || err)
  );
};

// Recompute and cache the tour's rating aggregate from the Review collection
// (single source of truth) onto the Tour doc. Exported so the Trash controller
// can re-run it after a review is restored.
export const recomputeTourRating = async (tourId) => {
  const agg = await Review.aggregate([
    // aggregate() bypasses the soft-delete query hook, exclude trashed reviews explicitly.
    { $match: { tour: new mongoose.Types.ObjectId(tourId), deleted: { $ne: true } } },
    { $group: { _id: "$tour", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const avg = agg[0]?.avg ?? 0;
  const count = agg[0]?.count ?? 0;
  await Tour.findByIdAndUpdate(tourId, {
    $set: { avgRating: Math.round(avg * 10) / 10, reviewCount: count },
  });
};

// Create a new review. Author identity is taken from the authenticated user.
export const createReview = async (req, res) => {
  const { rating, reviewText } = req.body;
  const { TourId } = req.params;

  try {
    const tour = await Tour.findById(TourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }

    // One review per user per tour, stops a single account from spamming
    // reviews and skewing the cached avgRating with duplicates.
    const already = await Review.findOne({ tour: tour._id, user: req.user._id });
    if (already) {
      return res
        .status(409)
        .json({ success: false, message: "You've already reviewed this journey." });
    }

    const newReview = new Review({
      tour: tour._id,
      user: req.user._id,
      username: req.user.username,
      reviewText,
      rating,
    });
    await newReview.save();
    await recomputeTourRating(tour._id);
    refreshInsightsAsync(tour._id); // keep cached insights live (non-blocking)

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: newReview,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create review" });
  }
};

// Get all reviews for a tour, supports opt-in ?page&limit
export const getTourReviews = async (req, res) => {
  const { TourId } = req.params;
  try {
    const tour = await Tour.findById(TourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }
    const pg = getPagination(req);
    let query = Review.find({ tour: TourId }).sort({ createdAt: -1 });
    if (pg) query = query.skip(pg.skip).limit(pg.limit);
    const reviews = await query;
    const total = pg ? await Review.countDocuments({ tour: TourId }) : reviews.length;
    res.status(200).json(listResponse(reviews, pg, total));
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to get tour reviews" });
  }
};

// Get every review across all tours (admin moderation)
export const getAllReviews = async (req, res) => {
  try {
    const pg = getPagination(req);
    let query = Review.find().populate("tour", "title").sort({ createdAt: -1 });
    if (pg) query = query.skip(pg.skip).limit(pg.limit);
    const reviews = await query;
    const total = pg ? await Review.countDocuments() : reviews.length;
    res.status(200).json(listResponse(reviews, pg, total));
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to get reviews" });
  }
};

// Delete a review (admin), SOFT delete (restorable from Trash). The rating
// aggregate + insights are recomputed from the reviews that remain visible.
export const deleteReview = async (req, res) => {
  const { reviewId } = req.params;
  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }
    const tourId = review.tour;
    await review.softDelete();
    if (tourId) {
      await recomputeTourRating(tourId);
      refreshInsightsAsync(tourId); // re-derive insights from the remaining reviews
    }
    res.status(200).json({ success: true, message: "Review moved to Trash" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete review" });
  }
};
