import express from "express";
import { authRequired } from "../middleware/auth.js";
import { createOrder, verifyPayment } from "../controllers/payments.controller.js";

const router = express.Router();

router.post("/create-order", authRequired, createOrder);
router.post("/verify", authRequired, verifyPayment);

export default router;