import User from "../models/User.js";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";

export const getAdminStats = async (_req, res) => {
  try {
    const [users, rooms, bookings, upcoming, cancelled] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Booking.countDocuments({ status: { $ne: "cancelled" } }),
      Booking.countDocuments({ status: { $ne: "cancelled" }, startDate: { $gte: new Date() } }),
      Booking.countDocuments({ status: "cancelled" })
    ]);

    res.json({ users, rooms, bookings, upcoming, cancelled });
  } catch (err) {
    console.error("getAdminStats error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};
