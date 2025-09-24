import express from "express";
import { authRequired } from "../middleware/auth.js";
import { getInvoice } from "../controllers/invoice.controller.js";

const router = express.Router();

router.get("/:id", authRequired, getInvoice);

export default router;
