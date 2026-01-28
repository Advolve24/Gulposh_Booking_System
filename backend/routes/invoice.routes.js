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
router.get("/admin/:id/download", requireAdminSession, downloadInvoicePDF);

/* ================= USER ================= */
router.get(
  "/user/:id/download",
  authRequired,
  downloadInvoicePDF
);

export default router;