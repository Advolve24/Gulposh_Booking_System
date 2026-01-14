import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import mongoose from "mongoose";

export const adminGlobalSearch = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ users: [], bookings: [], rooms: [] });

    const regex = new RegExp(q, "i");
    const isId = mongoose.isValidObjectId(q);

    const [users, bookings, rooms] = await Promise.all([
      User.find({
        $or: [
          { name: regex },
          { email: regex },
          { phone: regex },
          { mobile: regex },
        ],
      })
        .limit(5)
        .select("_id name email phone"),

      Booking.find({
        $or: [
          isId ? { _id: q } : null,
          { guestName: regex },
          { guestEmail: regex },
        ].filter(Boolean),
      })
        .populate("user", "name email")
        .limit(5),

      Room.find({ name: regex })
        .limit(5)
        .select("_id name"),
    ]);

    res.json({ users, bookings, rooms });
  } catch (err) {
    console.error("adminGlobalSearch error:", err);
    res.status(500).json({ message: "Search failed" });
  }
};
