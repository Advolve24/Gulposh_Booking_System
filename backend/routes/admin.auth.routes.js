import express from "express";
import { adminLogin, adminLogout, adminMe } from "../controllers/admin.auth.controller.js";
import { requireAdminSession } from "../middleware/adminSession.js";

const router = express.Router();
router.post("/login", adminLogin);
router.post("/logout", requireAdminSession, adminLogout);
router.get("/me", requireAdminSession, adminMe);
export default router;
