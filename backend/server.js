import "dotenv/config.js";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import http from "http";
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import adminNotifications from "./routes/adminNotifications.js";
import adminAuthRoutes from "./routes/admin.auth.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import blackoutRoutes from "./routes/blackout.routes.js";
import adminBlackoutRoutes from "./routes/admin.blackout.routes.js";
import adminUploadRoutes from "./routes/admin.upload.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import enquiryRoutes from "./routes/enquiry.routes.js";
import taxRoutes from "./routes/tax.routes.js";

import { verifySMTP } from "./utils/mailer.js";
import { initSocket } from "./lib/socket.js";

const app = express();

app.set("trust proxy", 1);

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://gulposhbookingsystem.netlify.app",
  "https://gulposhadminsystem.netlify.app",
  "https://gulposh-booking-system.vercel.app",
  "https://booking.villagulposh.com",
  "https://admin.villagulposh.com",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      console.error("❌ Blocked by CORS:", origin);
      return callback(null, false); 
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/", (_req, res) => {
  res.send("✅ API is up");
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/payments", paymentsRoutes);

app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/notifications", adminNotifications);
app.use("/api/admin", adminUploadRoutes);
app.use("/api/admin/blackouts", adminBlackoutRoutes);

app.use("/api/bookings", bookingRoutes);
app.use("/api/blackouts", blackoutRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/tax", taxRoutes);

app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    const port = process.env.PORT || 5000;

    const server = http.createServer(app);
    initSocket(server);

    server.listen(port, async () => {
      console.log(`✅ Server running on port ${port}`);
      await verifySMTP();
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
  });
