import mongoose from "mongoose";
import softDeletePlugin from "../utils/softDelete.js";

const reviewSchema = new mongoose.Schema(
  {
    tour: {
      type: mongoose.Types.ObjectId,
      ref: "Tour",
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    username: {
      type: String,
      required: true,
    },
    reviewText: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      default: 0,
    },

    // Review intelligence
    // Per-review NLP analysis: overall sentiment + the aspects this review
    // actually discussed, each with its own sentiment. Written by the batch
    // pipeline (ai/reviews.js); deterministically rolled up onto the tour's
    // cached `reviewInsights`. `analyzedAt` null => not yet analysed.
    analysis: {
      sentiment: {
        type: String,
        enum: ["positive", "neutral", "negative"],
        default: undefined,
      },
      aspects: {
        type: [
          {
            _id: false,
            aspect: String, // controlled vocab (ai/reviews.js ASPECTS)
            sentiment: { type: String, enum: ["positive", "neutral", "negative"] },
          },
        ],
        default: [],
      },
      analyzedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Speeds up the per-tour review listing and the "already reviewed?" lookup.
reviewSchema.index({ tour: 1, user: 1 });

reviewSchema.plugin(softDeletePlugin);

export default mongoose.model("Review", reviewSchema);
