import express from "express";
import {
  createTour,
  deleteTour,
  getAllTour,
  getFeaturedTour,
  getSingleTour,
  getTourCount,
  getToursByRegion,
  updateTour,
} from "../controllers/tourController.js";
import { verifyAdmin } from "../utils/verifyToken.js";

const tourRoute = express.Router();

// 🔒 Admin-only routes
tourRoute.post("/", verifyAdmin, createTour);
tourRoute.put("/:id", verifyAdmin, updateTour);
tourRoute.delete("/:id", verifyAdmin, deleteTour);

// ✅ Specific routes (put these BEFORE /:id)
tourRoute.get("/featured", getFeaturedTour);
tourRoute.get("/region/:region", getToursByRegion);
tourRoute.get("/count", getTourCount);

// ❗Generic route — keep this LAST
tourRoute.get("/:id", getSingleTour);

// 🔁 General tours (no params)
tourRoute.get("/", getAllTour);

export default tourRoute;
