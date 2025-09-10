import mongoose from "mongoose";
import User from "../models/User.js";
import Booking from "../models/Booking.js";

const { isValidObjectId } = mongoose;

export const listUsersAdmin = async (_req, res) => {
  try {
    const users = await User.find()
      .select("name email phone createdAt")
      .sort({ createdAt: -1 });

    const counts = await Booking.aggregate([
      { $group: {
          _id: "$user",
          count: { $sum: 1 },
          lastBookingAt: { $max: "$createdAt" }
      }}
    ]);

    const byId = new Map(counts.map(c => [String(c._id), c]));
    const out = users.map(u => {
      const add = byId.get(String(u._id)) || {};
      return {
        _id: u._id,
        name: u.name || "",
        email: u.email || "",
        phone: u.phone || "",
        createdAt: u.createdAt,
        bookingsCount: add.count || 0,
        lastBookingAt: add.lastBookingAt || null
      };
    });

    res.json(out);
  } catch (err) {
    console.error("listUsersAdmin error:", err);
    res.status(500).json({ message: "Failed to load users" });
  }
};

export const getUserAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

    const user = await User.findById(id).select("name email phone createdAt");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("getUserAdmin error:", err);
    res.status(500).json({ message: "Failed to load user" });
  }
};

export const listUserBookingsAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

    const bookings = await Booking.find({ user: id })
      .select("room startDate endDate status createdAt total")
      .populate("room", "name")
      .sort({ startDate: -1 });

    res.json(bookings.map(b => ({
      _id: b._id,
      room: b.room ? { _id: b.room._id, name: b.room.name } : null,
      startDate: b.startDate,
      endDate: b.endDate,
      status: b.status,
      total: b.total ?? null,
      createdAt: b.createdAt,
    })));
  } catch (err) {
    console.error("listUserBookingsAdmin error:", err);
    res.status(500).json({ message: "Failed to load bookings" });
  }
};


export const listBookingsAdmin = async (req, res) => {
  try {
    const { status, room, q, from, to } = req.query;

    // base filter
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (room && mongoose.isValidObjectId(room)) filter.room = room;

    // date overlap: booking [startDate, endDate] intersects [from, to]
    if (from || to) {
      const fromD = from ? new Date(from) : null;
      const toD   = to   ? new Date(to)   : null;
      // only add if valid
      if (fromD && !isNaN(fromD)) filter.endDate   = { ...(filter.endDate || {}),   $gte: fromD };
      if (toD   && !isNaN(toD))   filter.startDate = { ...(filter.startDate || {}), $lte: toD };
    }

    let items = await Booking.find(filter)
      .populate("user", "name email")
      .populate("room", "name")
      .sort({ createdAt: -1 })
      .lean();

    // lightweight text filter after query (name/email/bookingId/guestName/guestEmail)
    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      const isId = mongoose.isValidObjectId(term);
      items = items.filter(b =>
        (isId && String(b._id) === term) ||
        (b.user?.name || "").toLowerCase().includes(term) ||
        (b.user?.email || "").toLowerCase().includes(term) ||
        (b.guestName || "").toLowerCase().includes(term) ||
        (b.guestEmail || "").toLowerCase().includes(term)
      );
    }

    res.json(items.map(b => ({
      _id: b._id,
      user: b.user ? { _id: b.user._id, name: b.user.name, email: b.user.email } : null,
      room: b.room ? { _id: b.room._id, name: b.room.name } : null,
      startDate: b.startDate,
      endDate: b.endDate,
      guests: b.guests ?? null,
      status: b.status,
      total: b.total ?? null,
      createdAt: b.createdAt,
      note: b.note ?? null,
    })));
  } catch (err) {
    console.error("listBookingsAdmin error:", err);
    res.status(500).json({ message: "Failed to load bookings" });
  }
};


export const cancelBookingAdmin = async (req, res) => {
  try {
    const { id } = req.params; // booking id
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const b = await Booking.findById(id);
    if (!b) return res.status(404).json({ message: "Booking not found" });

    if (b.status === "cancelled") {
      return res.json({ ok: true, booking: b });
    }

    b.status = "cancelled";
    await b.save();

    res.json({ ok: true, booking: b });
  } catch (err) {
    console.error("cancelBookingAdmin error:", err);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
};