import User from "../models/User.js";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";

export const getAdminStats = async (_req, res) => {
  const [users, rooms, bookings, upcoming] = await Promise.all([
    User.countDocuments(),
    Room.countDocuments(),
    Booking.countDocuments({ status: { $ne: "cancelled" } }),
    Booking.countDocuments({ status: { $ne: "cancelled" }, startDate: { $gte: new Date() } })
  ]);

  res.json({ users, rooms, bookings, upcoming });
};
