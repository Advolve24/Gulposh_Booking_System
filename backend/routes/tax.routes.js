import express from "express";
import { getActiveTax } from "../controllers/taxSetting.controller.js";

const router = express.Router();

/**
 * @route   GET /api/tax
 * @desc    Get current tax percentage
 * @access  Public
 */
router.get("/", getActiveTax);

export default router;