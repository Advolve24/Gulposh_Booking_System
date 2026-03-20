import express from "express";
import { getActiveTax, getDiscountConfig } from "../controllers/taxSetting.controller.js";

const router = express.Router();

router.get("/", getActiveTax);
router.get("/discount", getDiscountConfig);


export default router;
