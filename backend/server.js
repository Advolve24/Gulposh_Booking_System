// server.js
import "dotenv/config.js";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";

// Routes
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import adminAuthRoutes from "./routes/admin.auth.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import blackoutRoutes from "./routes/blackout.routes.js";
import adminBlackoutRoutes from "./routes/admin.blackout.routes.js";

const app = express();

/**
 * Behind Render/Heroku proxies you MUST trust the proxy so secure cookies are set correctly.
 * Also make sure your login route sets cookies with { sameSite: 'none', secure: true } in production.
 */
app.set("trust proxy", 1);

// ---- CORS (with credentials) ----
/**
 * Allow-list your front-end origins (Netlify + local dev).
 * You can also supply a comma-separated list via CORS_ALLOWLIST env.
 */
const ENV_ALLOW = (process.env.CORS_ALLOWLIST || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const ALLOWED = new Set([
  // local dev
  "http://localhost:5173",
  "http://localhost:5174",
  // your Netlify apps
  "https://villagulposh.netlify.app",
  "https://gulposhbookingsystem.netlify.app",
  "https://gulposhadminsystem.netlify.app",
  // env overrides
  ...ENV_ALLOW,
]);

const corsOptions = {
  origin(origin, cb) {
    // allow same-origin / server-to-server / curl (no Origin header)
    if (!origin) return cb(null, true);
    if (ALLOWED.has(origin)) return cb(null, true);
    // block everything else
    return cb(new Error(`CORS: origin not allowed: ${origin}`));
  },
  credentials: true, // <-- REQUIRED for cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// Explicit preflight handler (important for some proxies/CDNs)
app.options("*", cors(corsOptions));

// ---- Standard middlewares ----
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Health check
app.get("/", (_req, res) => res.send("API is up"));

// ---- Public routes ----
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/blackouts", blackoutRoutes);

// ---- Admin auth (login/logout) + protected admin routes ----
// NOTE: adminAuthRoutes should come BEFORE adminRoutes so login works without auth middleware.
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/blackouts", adminBlackoutRoutes);

// Optional 404 for unmatched API routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "Not found" });
  }
  next();
});

// Optional generic error handler (helps surface CORS errors in logs)
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err?.message || err);
  if (String(err?.message || "").startsWith("CORS: origin not allowed")) {
    return res.status(403).json({ message: err.message });
  }
  res.status(500).json({ message: "Server error" });
});

// ---- DB + start ----
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Connected! Running on ${port}`));
  })
  .catch(console.error);
