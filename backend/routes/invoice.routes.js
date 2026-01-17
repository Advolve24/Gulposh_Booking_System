import express from "express";
import { authRequired } from "../middleware/auth.js";
import { getInvoice ,downloadInvoicePDF } from "../controllers/invoice.controller.js";
import { requireAdminSession } from "../middleware/adminSession.js";


const router = express.Router();

router.get("/:id", requireAdminSession, getInvoice);
router.get("/:id/download", requireAdminSession, downloadInvoicePDF);

export default router;
