import express from "express";
import { requireAdminSession } from "../middleware/adminSession.js";
import { createRoom, listRoomsAdmin, deleteRoom, getRoomAdmin, updateRoom } from "../controllers/admin.room.controller.js";
import { getAdminStats } from "../controllers/admin.stats.controller.js";
import { listUsersAdmin, getUserAdmin, listUserBookingsAdmin, listBookingsAdmin, updateUserAdmin, deleteUserAdmin,  createUserAdmin, 
  updateBookingAdmin,  getBookingAdmin, checkUserByPhoneAdmin, cancelBookingAdmin } from "../controllers/admin.user.controller.js";
import { createVillaOrder, verifyVillaPayment } from "../controllers/admin.villa.controller.js";
import { adminGlobalSearch } from "../controllers/admin.search.controller.js";
import {
  adminActionBooking,
} from "../controllers/admin.booking.controller.js";


const router = express.Router();

router.use(requireAdminSession);

/* ================= FCM ================= */


router.post("/fcm-token", async (req, res) => {
console.log("🔥 FCM ROUTE HIT", req.user.id);


const { token } = req.body;
if (!token) {
return res.status(400).json({ message: "FCM token required" });
}


await User.updateOne(
{ _id: req.user.id, isAdmin: true },
{ $addToSet: { fcmTokens: token } }
);


res.json({ success: true });
});


router.delete("/fcm-token", async (req, res) => {
const { token } = req.body;
if (!token) return res.json({ success: true });


await User.updateOne(
{ _id: req.user.id },
{ $pull: { fcmTokens: token } }
);


res.json({ success: true });
});


router.get("/stats", getAdminStats);
router.get("/rooms", listRoomsAdmin);
router.post("/rooms", createRoom);
router.delete("/rooms/:id", deleteRoom);
router.get("/rooms/:id", getRoomAdmin);     
router.put("/rooms/:id", updateRoom);
router.get("/users", listUsersAdmin);
router.post("/users", createUserAdmin);
router.get("/users/:id", getUserAdmin);
router.get("/users/check-phone/:phone", checkUserByPhoneAdmin);
router.get("/users/:id/bookings", listUserBookingsAdmin);

router.get("/bookings", listBookingsAdmin);          
router.get("/bookings/:id", getBookingAdmin);        
router.put("/bookings/:id", updateBookingAdmin);    

router.post("/bookings/:id/action", adminActionBooking);
// router.post("/bookings/:id/cancel", cancelBookingAdmin);
// router.patch("/bookings/:id/cancel", cancelBookingAdmin);
router.put("/users/:id", updateUserAdmin);      
router.delete("/users/:id", deleteUserAdmin);
router.post("/villa-order", createVillaOrder);
router.post("/villa-verify", verifyVillaPayment);
router.get("/search", adminGlobalSearch);
router.post("/bookings/:id/cancel", cancelBookingAdmin);


export default router;
