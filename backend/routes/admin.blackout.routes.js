import express from "express";
import { requireAdminSession } from "../middleware/adminSession.js";
import { listBlackouts, createBlackout, deleteBlackout } from "../controllers/blackout.controller.js";

const router = express.Router();

router.use(requireAdminSession);
router.get("/", listBlackouts);
router.post("/", createBlackout);
router.delete("/:id", deleteBlackout);

export default router;
