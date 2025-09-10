import express from "express";
import { listBlackouts } from "../controllers/blackout.controller.js";
const router = express.Router();

router.get("/", listBlackouts);

export default router;
