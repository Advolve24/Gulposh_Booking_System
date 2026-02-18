import express from "express";
import { authRequired } from "../middleware/auth.js";
import { createEntireVillaEnquiry, getMyEnquiries } from "../controllers/enquiry.controller.js";

const router = express.Router();


router.post("/entire-villa", authRequired, createEntireVillaEnquiry);
router.get("/my", authRequired, getMyEnquiries);

export default router;
