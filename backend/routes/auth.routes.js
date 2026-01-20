import express from "express";
import {
  phoneLogin,
  googleLogin,
  logout,
  me,
  updateMe,
} from "../controllers/auth.controller.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

/* ===============================
   AUTH
================================ */

// Phone OTP → Backend session
router.post("/phone-login", phoneLogin);


// Google OAuth → Backend JWT
router.post("/google-login", googleLogin);

// Logout + refresh
router.post("/logout", logout);

/* ===============================
   PROFILE
================================ */

router.get("/me", authRequired, me);
router.put("/me", authRequired, updateMe);

export default router;
