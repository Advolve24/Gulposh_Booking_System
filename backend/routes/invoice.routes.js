import express from "express";
import { authRequired } from "../middleware/auth.js";
import { requireAdminSession } from "../middleware/adminSession.js";
import {
  getInvoice,
  downloadInvoicePDF,
} from "../controllers/invoice.controller.js";

const router = express.Router();

/* ================= ADMIN ================= */
router.get("/admin/:id", requireAdminSession, getInvoice);

/* ================= BOTH ADMIN + USER (PDF DOWNLOAD) ================= */
router.get("/:id/download", authRequired, downloadInvoicePDF);

// router.get("/admin/:id/download", requireAdminSession, downloadInvoicePDF);

// router.get(
//   "/user/:id/download",
//   authRequired,
//   downloadInvoicePDF
// );

export default router;