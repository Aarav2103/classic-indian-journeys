import express from "express";
import { z } from "zod";
import { validateBody } from "../utils/validate.js";
import { subscribe, getSubscribers } from "../controllers/newsletterController.js";
import verifyToken, { verifyAdmin } from "../utils/verifyToken.js";
import { publicWriteLimiter } from "../utils/rateLimiters.js";

const newsletterRoute = express.Router();

const subscribeSchema = z.object({
  email: z.string().email().max(200),
});

newsletterRoute.post("/", publicWriteLimiter, validateBody(subscribeSchema), subscribe);
newsletterRoute.get("/", verifyToken, verifyAdmin, getSubscribers);

export default newsletterRoute;
