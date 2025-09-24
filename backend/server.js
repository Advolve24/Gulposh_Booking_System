import "dotenv/config.js";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import adminAuthRoutes from "./routes/admin.auth.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import blackoutRoutes from "./routes/blackout.routes.js";
import adminBlackoutRoutes from "./routes/admin.blackout.routes.js";
import adminUploadRoutes from "./routes/admin.upload.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js"
import path from "node:path";
import fs from "node:fs";

const app = express();
app.set("trust proxy", 1);

const ALLOWED = [
  "https://villagulposh.netlify.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://gulposhadminsystem.netlify.app",
  "https://gulposhbookingsystem.netlify.app",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin"); // proxies/CDN correctness
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ——— standard middlewares ———
app.use(express.json());
app.use(cookieParser());

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

// optional health check
app.get("/", (_req, res) => res.send("API is up"));

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminUploadRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/blackouts", blackoutRoutes);
app.use("/api/admin/blackouts", adminBlackoutRoutes);
app.use("/api/invoice", invoiceRoutes);

// ——— DB + start ———
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Connected! Running on ${port}`));
  })
  .catch(console.error);
