import express from "express";
import {
  phoneLogin,
  googleLogin,
  logout,
  me,
  updateMe,
  refresh,
  deleteMe
} from "../controllers/auth.controller.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();


router.post("/phone-login", phoneLogin);

router.post("/google-login", googleLogin);

router.post("/refresh", refresh); 

router.post("/logout", logout);

router.delete("/me", authRequired, deleteMe);
router.get("/me", authRequired, me);
router.put("/me", authRequired, updateMe);

export default router;
