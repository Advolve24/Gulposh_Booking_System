import express from "express";
import { authRequired } from "../middleware/auth.js";
import { getMyBookings, cancelMyBooking, getBooking } from "../controllers/booking.controller.js";


const router = express.Router();

router.get("/mine", authRequired, getMyBookings);     
router.get("/:id", authRequired, getBooking);         
router.post("/:id/cancel", authRequired, cancelMyBooking); 


export default router;
