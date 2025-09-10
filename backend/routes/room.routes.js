import express from "express";
import {
  listRooms,
  getRoomById,
  getBlockedDates,
  getBlockedDatesAll,
  getDisabledRanges,
} from "../controllers/room.controller.js";

const router = express.Router();

router.get("/", listRooms);

router.get("/blocked", getBlockedDatesAll); 

router.get("/:id/blocked", getBlockedDates);

router.get("/:id", getRoomById);

router.get("/disabled/all", getDisabledRanges);

export default router;
