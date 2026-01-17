import express from "express";
import { authRequired } from "../middleware/auth.js";
import { requireAdminSession } from "../middleware/adminSession.js";
import {
  getInvoice,
  downloadInvoicePDF,
} from "../controllers/invoice.controller.js";

const router = express.Router();


router.get("/:id", requireAdminSession, getInvoice);
router.get("/:id/download", requireAdminSession, downloadInvoicePDF);


router.get(
  "/user/:id/download",
  authRequired,
  downloadInvoicePDF
);

export default router;
