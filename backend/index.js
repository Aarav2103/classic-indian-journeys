import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoute from "./router/auth.js";
import tourRoute from "./router/tours.js";
import userRoute from "./router/users.js";
import reviewRoute from "./router/review.js";
import bookingRoute from "./router/bookings.js";
import contactRoute from "./router/contact.js";
import newsletterRoute from "./router/newsletter.js";
import knowledgeRoute from "./router/knowledge.js";
import trashRoute from "./router/trash.js";

dotenv.config();

const requiredEnv = ["MONGO_URI", "JWT_SECRET"];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(
    `\n[FATAL] Missing required environment variables: ${missing.join(", ")}\n` +
      "Set them in your .env file or your deployment dashboard before starting the server.\n"
  );
  process.exit(1);
}

// Refuse to boot with an obviously-insecure config so a misconfigured deploy
// fails fast instead of running with, say, JWT_SECRET=idk. Stricter in prod.
(function validateConfig() {
  const isProd = process.env.NODE_ENV === "production";
  const secret = process.env.JWT_SECRET || "";
  const weak = new Set(["idk", "secret", "jwt", "jwtsecret", "changeme", "change-me", "password", "test", "dev"]);
  const problems = [];

  if (weak.has(secret.toLowerCase()) || secret.length < 12) {
    problems.push("JWT_SECRET is weak, generate a long random value, e.g. `openssl rand -base64 48`.");
  }
  if (isProd) {
    if (secret.length < 32) {
      problems.push("JWT_SECRET must be at least 32 characters in production.");
    }
    const clientUrl = process.env.CLIENT_URL || "";
    if (!clientUrl || clientUrl.includes("localhost") || clientUrl.includes("127.0.0.1")) {
      problems.push("CLIENT_URL must be set to your real frontend origin(s) in production (no localhost).");
    }
  }

  if (problems.length) {
    console.error("\n[FATAL] Insecure configuration:\n  - " + problems.join("\n  - ") + "\n");
    process.exit(1);
  }
})();

const app = express();
const port = process.env.PORT || 8000;

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: origin ${origin} not allowed`));
  },
  credentials: true,
};

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.status(200).send("Classic Indian Journeys API is running.");
});

// Lightweight health check for uptime monitors / load balancers. Reports 503
// (not 200) if the database link is down so an orchestrator can react.
app.get("/healthz", (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "degraded",
    db: connected ? "connected" : "disconnected",
    uptime: process.uptime(),
  });
});

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/tours", tourRoute);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/review", reviewRoute);
app.use("/api/v1/booking", bookingRoute);
app.use("/api/v1/contact", contactRoute);
app.use("/api/v1/newsletter", newsletterRoute);
app.use("/api/v1/knowledge", knowledgeRoute);
app.use("/api/v1/trash", trashRoute);

// 404, any unmatched route returns JSON, not Express's default HTML page.
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Centralized error handler. Maps common Mongoose / CORS errors to sensible
// status codes and keeps internal details out of the response body.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.name === "CastError") {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}` });
  }
  if (err?.name === "ValidationError") {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (typeof err?.message === "string" && err.message.startsWith("CORS blocked")) {
    return res.status(403).json({ success: false, message: "Origin not allowed" });
  }
  console.error("[error]", err);
  res
    .status(err?.status || 500)
    .json({ success: false, message: "Internal server error" });
});

mongoose.set("strictQuery", false);

async function connect() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB Database Connected");
}

// Connect to the database FIRST; only start accepting traffic once it's
// reachable. If the initial connection fails, exit non-zero so the platform
// restarts the process instead of serving a server that 500s every request.
connect()
  .then(() => {
    app.listen(port, () => console.log("Server is listening on port", port));
  })
  .catch((err) => {
    console.error("[FATAL] MongoDB connection failed at startup:", err.message);
    process.exit(1);
  });
