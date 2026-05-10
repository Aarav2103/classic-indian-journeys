import rateLimit from "express-rate-limit";

// Throttle public, unauthenticated write endpoints (contact, newsletter,
// booking, review, comment) so a bot can't flood the enquiries inbox or spam
// reviews. Generous enough that a real person never hits it.
export const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again in a little while." },
});

// Tighter limit for AI endpoints, each call hits an LLM (latency + cost), so
// cap per-IP bursts well below the public-write limit.
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many AI requests. Please slow down and try again shortly." },
});
