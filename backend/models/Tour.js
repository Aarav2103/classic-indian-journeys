import mongoose from "mongoose";
import softDeletePlugin from "../utils/softDelete.js";

const tourSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    city: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    distance: {
      type: Number,
      required: true,
    },
    photo: {
      type: String,
      required: true,
    },
    desc: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    maxGroupSize: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number, // length of the journey, in days
      min: 1,
    },
    region: {
      type: String, 
      required: true,
    },
    // Derived aggregate maintained on review create/delete. The Review
    // collection is the single source of truth for review *content*; these two
    // fields are just a cache so cards can show a rating without an N+1 query.
    avgRating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },

    // Rich content (AI-enriched via seedTourContent.js)
    // Powers tag-aware search, grounded itinerary planning, RAG, and richer
    // tour pages. Grounded in the real title/route/region; safe to regenerate.
    overview: {
      type: String, // 2-4 evocative sentences in the house voice
      default: "",
    },
    tags: {
      type: [String], // controlled theme vocabulary, lowercase (e.g. "wildlife", "heritage")
      default: [],
      index: true,
    },
    highlights: {
      type: [String], // 4-6 short highlight phrases
      default: [],
    },
    bestMonths: {
      type: [String], // month names when the journey is at its best
      default: [],
    },
    itinerary: {
      // Real day-by-day structure, derived from the route. Lets the planner
      // cite actual days instead of inventing them, and powers the tour page.
      type: [
        {
          _id: false,
          day: Number,
          title: String,
          detail: String,
        },
      ],
      default: [],
    },

    // Review intelligence, cached, like avgRating/reviewCount
    // Batch NLP pipeline output over this tour's Review freetext: aspect-based
    // sentiment + an editorial pros/cons summary. Recomputed by ai/reviews.js
    // (seedReviewInsights.js in bulk; on each new review via the controller).
    // The Review collection stays the source of truth for content; this is a
    // read-optimised aggregate so cards/detail render without re-analysing.
    reviewInsights: {
      summary: { type: String, default: "" }, // 1-2 sentence editorial synthesis
      pros: { type: [String], default: [] }, // 2-4 recurring strengths
      cons: { type: [String], default: [] }, // 0-3 recurring caveats
      // Per-aspect rollup (controlled vocab, see ai/reviews.js ASPECTS).
      // score = % of opinions that were positive (0-100); mentions = how many
      // reviews touched the aspect, so the UI can rank/threshold by signal.
      aspects: {
        type: [
          {
            _id: false,
            aspect: String,
            score: Number, // 0-100 positivity
            positive: Number,
            negative: Number,
            neutral: Number,
            mentions: Number,
          },
        ],
        default: [],
      },
      // Overall sentiment distribution across analysed reviews (counts).
      sentiment: {
        positive: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 },
        negative: { type: Number, default: 0 },
      },
      basedOn: { type: Number, default: 0 }, // # reviews the rollup is built from
      generatedAt: { type: Date }, // null => never analysed (idempotency marker)
    },
  },
  { timestamps: true }
);

tourSchema.plugin(softDeletePlugin);

export default mongoose.model("Tour", tourSchema);
