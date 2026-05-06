import mongoose from "mongoose";
import softDeletePlugin from "../utils/softDelete.js";

const bookingSchema = new mongoose.Schema(
  {
    // Identity is set server-side from the authenticated user, never trusted
    // from the request body.
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
    },
    // Canonical reference plus a snapshot of the title at booking time.
    tour: {
      type: mongoose.Types.ObjectId,
      ref: "Tour",
      required: true,
    },
    tourName: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    groupSize: {
      type: Number,
      required: true,
      min: 1,
    },
    phone: {
      type: String, // strings, not numbers, real phone numbers have +, spaces, leading 0
      required: true,
    },
    bookAt: {
      type: Date,
      required: true,
    },
    // Price snapshot at the time of booking, so the record is self-contained
    // and doesn't drift if the tour price later changes.
    currency: {
      type: String,
      default: "INR",
    },
    priceInr: {
      type: Number,
      required: true,
    },
    totalInr: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

bookingSchema.plugin(softDeletePlugin);

export default mongoose.model("Booking", bookingSchema);
