import express from "express";
import { authRequired } from "../middleware/auth.js";
import { createEntireVillaEnquiry } from "../controllers/enquiry.controller.js";

const router = express.Router();


router.post("/entire-villa", createEntireVillaEnquiry);

export default router;
