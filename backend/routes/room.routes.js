import express from "express";
import {
  listRooms,
  getRoomById,
  getBlockedDates,
  getBlockedDatesAll,
  getDisabledRanges,
  getRoomBookings,
} from "../controllers/room.controller.js";

const router = express.Router();

router.get("/", listRooms);

router.get("/blocked", getBlockedDatesAll); 

router.get("/:id/blocked", getBlockedDates);

router.get("/:id", getRoomById);

router.get("/disabled/all", getDisabledRanges);

router.get("/:id/bookings", getRoomBookings);  



export default router;
