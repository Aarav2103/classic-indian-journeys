import express from 'express';
import { z } from 'zod';
import { validateBody } from '../utils/validate.js';
import { publicWriteLimiter } from '../utils/rateLimiters.js';
import {
  createReview,
  getTourReviews,
  getAllReviews,
  deleteReview,
} from "../controllers/reviewController.js";
import verifyToken, { verifyAdmin } from '../utils/verifyToken.js';
import { validateObjectId } from '../utils/validateObjectId.js';

const reviewRoute = express.Router();

const reviewSchema = z.object({
  rating: z.coerce.number().min(0).max(5),
  reviewText: z.string().min(1).max(2000),
});

// Get every review (admin moderation), keep before /:TourId
reviewRoute.get('/', verifyToken, verifyAdmin, getAllReviews);

// Create a review (must be logged in; author taken from the token)
reviewRoute.post('/:TourId', publicWriteLimiter, verifyToken, validateObjectId('TourId'), validateBody(reviewSchema), createReview);

// Get all reviews for a tour
reviewRoute.get('/:TourId', validateObjectId('TourId'), getTourReviews);

// Delete a review (admin)
reviewRoute.delete('/:reviewId', verifyToken, verifyAdmin, validateObjectId('reviewId'), deleteReview);

export default reviewRoute;
