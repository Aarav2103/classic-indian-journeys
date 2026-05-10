import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { registerUser, loginUser } from '../controllers/authController.js';
import { validateBody } from '../utils/validate.js';

const authRoute = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
});

const registerSchema = z.object({
  username: z.string().min(2).max(40),
  email: z.string().email().max(200),
  password: z.string().min(6).max(200),
  photo: z.string().max(2000).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

authRoute.post('/register', authLimiter, validateBody(registerSchema), registerUser);

authRoute.post('/login', authLimiter, validateBody(loginSchema), loginUser);

export default authRoute;
