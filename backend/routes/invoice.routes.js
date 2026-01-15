import express from "express";
import { authRequired } from "../middleware/auth.js";
import { getInvoice ,downloadInvoicePDF } from "../controllers/invoice.controller.js";


const router = express.Router();

router.get("/:id", authRequired, getInvoice);
router.get("/:id/download", authRequired, downloadInvoicePDF);

export default router;
