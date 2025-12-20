import express from "express";
import {
  phoneLogin,
  logout,
  me,
  refreshSession,
  updateMe,
} from "../controllers/auth.controller.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.post("/phone-login", phoneLogin);
router.post("/logout", logout);
router.post("/refresh", refreshSession);

router.get("/me", authRequired, me);
router.put("/me", authRequired, updateMe);

export default router;
