import express from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { validateBody } from '../utils/validate.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { publicWriteLimiter } from '../utils/rateLimiters.js';
import { createBooking, getAllBookings, getBooking, deleteBooking } from '../controllers/bookingController.js';
import verifyToken, { verifyAdmin } from '../utils/verifyToken.js';

const bookingRoute = express.Router();

const bookingSchema = z.object({
  tourId: z.string().refine((v) => mongoose.isValidObjectId(v), {
    message: 'tourId must be a valid id',
  }),
  fullName: z.string().min(1).max(120),
  phone: z.string().min(5).max(30),
  groupSize: z.coerce.number().int().min(1).max(100),
  // Must parse to a real date, a non-empty-but-invalid string would otherwise
  // cast to `Invalid Date` and blow up as a 500 on save.
  bookAt: z.string().min(1).refine((s) => !Number.isNaN(new Date(s).getTime()), {
    message: 'bookAt must be a valid date',
  }),
});

// Create a booking (must be logged in; identity + price set server-side)
bookingRoute.post('/', publicWriteLimiter, verifyToken, validateBody(bookingSchema), createBooking);

// Get all bookings (admin)
bookingRoute.get('/', verifyToken, verifyAdmin, getAllBookings);

// Get a single booking
bookingRoute.get('/:id', verifyToken, validateObjectId('id'), getBooking);

// Delete a booking (admin)
bookingRoute.delete('/:id', verifyToken, verifyAdmin, validateObjectId('id'), deleteBooking);

export default bookingRoute;
