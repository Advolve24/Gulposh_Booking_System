import express from "express";
import { authRequired } from "../middleware/auth.js";
import { createEntireVillaEnquiry } from "../controllers/enquiry.controller.js";

const router = express.Router();

/* ===============================
   ENTIRE VILLA ENQUIRY (FRONTEND)
================================ */

router.post(
  "/entire-villa",
  authRequired,               // user must be logged in
  createEntireVillaEnquiry
);

export default router;
