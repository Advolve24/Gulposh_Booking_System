import express from "express";
import { requireAdminSession } from "../middleware/adminSession.js";
import { createRoom, listRooms, deleteRoom, getRoomAdmin, updateRoom } from "../controllers/admin.room.controller.js";
import { getAdminStats } from "../controllers/admin.stats.controller.js";
import { listUsersAdmin, getUserAdmin, listUserBookingsAdmin, cancelBookingAdmin, listBookingsAdmin } from "../controllers/admin.user.controller.js";

const router = express.Router();

router.use(requireAdminSession);
router.get("/stats", getAdminStats);
router.get("/rooms", listRooms);
router.post("/rooms", createRoom);
router.delete("/rooms/:id", deleteRoom);
router.get("/rooms/:id", getRoomAdmin);     
router.put("/rooms/:id", updateRoom);
router.get("/users", listUsersAdmin);
router.get("/users/:id", getUserAdmin);
router.get("/users/:id/bookings", listUserBookingsAdmin);
router.post("/bookings/:id/cancel", cancelBookingAdmin);
router.patch("/bookings/:id/cancel", cancelBookingAdmin);
router.get("/bookings", listBookingsAdmin);

export default router;
