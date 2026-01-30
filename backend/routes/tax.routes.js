import express from "express";
import { getActiveTax } from "../controllers/taxSetting.controller.js";

const router = express.Router();

router.get("/", getActiveTax);


export default router;