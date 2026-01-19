import mongoose from "mongoose";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import bcrypt from "bcryptjs";

const { isValidObjectId } = mongoose;

export const listUsersAdmin = async (_req, res) => {
  try {
    const users = await User.find()
      .select("name email phone mobile dob createdAt")
      .sort({ createdAt: -1 });

    const counts = await Booking.aggregate([
      { $group: { _id: "$user", count: { $sum: 1 }, lastBookingAt: { $max: "$createdAt" } } }
    ]);

    const byId = new Map(counts.map(c => [String(c._id), c]));

    const out = users.map(u => {
      const add = byId.get(String(u._id)) || {};
      return {
        _id: u._id,
        name: u.name || "",
        email: u.email || "",
        phone: u.phone ?? u.mobile ?? "",
        dob: u.dob || null,
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

    const user = await User.findById(id).select("name email phone mobile dob createdAt");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      _id: user._id,
      name: user.name || "",
      email: user.email || "",
      phone: user.phone ?? user.mobile ?? "",
      dob: user.dob || null,
      createdAt: user.createdAt
    });
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
      .select(`
  user room startDate endDate nights guests
  status createdAt amount
  withMeal vegGuests nonVegGuests
  roomTotal mealTotal paymentId
`)
      .populate("room", "name")
      .sort({ startDate: -1 });

   res.json(items.map(b => ({
  _id: b._id,
  user: b.user,
  room: b.room,
  startDate: b.startDate,
  endDate: b.endDate,
  nights: b.nights,
  guests: b.guests,
  withMeal: b.withMeal,
  vegGuests: b.vegGuests,
  nonVegGuests: b.nonVegGuests,
  roomTotal: b.roomTotal,
  mealTotal: b.mealTotal,
  amount: b.amount,
  paymentId: b.paymentId,
  status: b.status,
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

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (room && mongoose.isValidObjectId(room)) filter.room = room;

    if (from || to) {
      const fromD = from ? new Date(from) : null;
      const toD = to ? new Date(to) : null;
      if (fromD && !isNaN(fromD)) filter.endDate = { ...(filter.endDate || {}), $gte: fromD };
      if (toD && !isNaN(toD)) filter.startDate = { ...(filter.startDate || {}), $lte: toD };
    }

    let items = await Booking.find(filter)
      .select("user room startDate endDate guests status createdAt amount note withMeal adminMeta total")
      .populate("user", "name email phone")
      .populate("room", "name")
      .sort({ createdAt: -1 })
      .lean();

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
      user: b.user ? { _id: b.user._id, name: b.user.name, email: b.user.email, phone: b.user.phone, } : null,
      room: b.room ? { _id: b.room._id, name: b.room.name } : null,
      startDate: b.startDate,
      endDate: b.endDate,
      guests: b.guests ?? null,
      status: b.status,
      amount: b.amount ?? null,
      adminMeta: b.adminMeta ?? {},
      total: b.total ?? null,
      createdAt: b.createdAt,
      note: b.note ?? null,
      withMeal: !!b.withMeal,
    })));
  } catch (err) {
    console.error("listBookingsAdmin error:", err);
    res.status(500).json({ message: "Failed to load bookings" });
  }
};


// export const cancelBookingAdmin = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!mongoose.isValidObjectId(id)) {
//       return res.status(400).json({ message: "Invalid booking id" });
//     }
//     const b = await Booking.findById(id);
//     if (!b) return res.status(404).json({ message: "Booking not found" });

//     if (b.status === "cancelled") {
//       return res.json({ ok: true, booking: b });
//     }
//     b.status = "cancelled";
//     await b.save();
//     res.json({ ok: true, booking: b });
//   } catch (err) {
//     console.error("cancelBookingAdmin error:", err);
//     res.status(500).json({ message: "Failed to cancel booking" });
//   }
// };


export const updateUserAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, phone, dob } = req.body || {};
    if (name !== undefined) user.name = String(name).trim();
    if (email !== undefined) user.email = String(email).trim();
    if (phone !== undefined) {
      const v = String(phone).trim();
      user.phone = v;
      user.mobile = v;
    }
    if (dob !== undefined) user.dob = dob ? new Date(dob) : null;

    await user.save();
    res.json({
      _id: user._id,
      name: user.name || "",
      email: user.email || "",
      phone: user.phone ?? user.mobile ?? "",
      dob: user.dob || null,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("updateUserAdmin error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
};



export const deleteUserAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    await Booking.deleteMany({ user: id });
    await User.findByIdAndDelete(id);

    res.json({ ok: true });
  } catch (err) {
    console.error("deleteUserAdmin error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};



export const createUserAdmin = async (req, res) => {
  try {
    let { name, email, phone, password, isAdmin } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email is required" });

    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: "Email already in use" });

    if (!password || String(password).length < 6) {
      password = Math.random().toString(36).slice(-10);
    }
    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      name: (name || "").trim(),
      email: normalizedEmail,
      phone: (phone || "").trim(),
      passwordHash,
      isAdmin: !!isAdmin,
    });

    const payload = {
      _id: user._id,
      name: user.name || "",
      email: user.email,
      phone: user.phone || "",
      isAdmin: !!user.isAdmin,
    };
    if (req.body?.password ? false : true) payload.tempPassword = password;

    res.status(201).json(payload);
  } catch (err) {
    console.error("createUserAdmin error:", err);
    res.status(500).json({ message: "Failed to create user" });
  }
};



const nightsBetween = (from, to) => {
  const a = new Date(from);
  const b = new Date(to);

  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);

  return Math.max(1, Math.round((b - a) / 86400000));
};



export const updateBookingAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await Booking.findById(id).populate("room");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const {
      startDate,
      endDate,
      guests,

      withMeal,
      vegGuests = 0,
      nonVegGuests = 0,
      comboGuests = 0,

      status,

      fullName,
      phone,
      govIdType,
      govIdNumber,
      amountPaid,
      paymentMode,
    } = req.body || {};

    if (startDate) booking.startDate = new Date(startDate);
    if (endDate) booking.endDate = new Date(endDate);

    if (booking.endDate <= booking.startDate) {
      return res.status(400).json({
        message: "Check-out date must be after check-in date",
      });
    }

    const nights = nightsBetween(booking.startDate, booking.endDate);
    booking.nights = nights;

    if (typeof guests === "number" && guests > 0) {
      booking.guests = guests;
    }

    booking.withMeal = !!withMeal;

    const totalMealGuests =
      Number(vegGuests) + Number(nonVegGuests) + Number(comboGuests);

    if (totalMealGuests > booking.guests) {
      return res.status(400).json({
        message: "Meal guests cannot exceed total guests",
      });
    }

    booking.vegGuests = Number(vegGuests) || 0;
    booking.nonVegGuests = Number(nonVegGuests) || 0;
    booking.comboGuests = Number(comboGuests) || 0;

    const vegPrice = Number(booking.mealMeta?.vegPrice || 0);
    const nonVegPrice = Number(booking.mealMeta?.nonVegPrice || 0);

    const vegTotal = booking.vegGuests * vegPrice * nights;
    const nonVegTotal = booking.nonVegGuests * nonVegPrice * nights;

    booking.mealTotal = booking.withMeal ? vegTotal + nonVegTotal : 0;

    booking.roomTotal = booking.pricePerNight * nights;
    booking.amount = booking.roomTotal + booking.mealTotal;

    if (status) booking.status = status;

    booking.adminMeta = {
      ...(booking.adminMeta || {}),
      fullName: fullName ?? booking.adminMeta?.fullName,
      phone: phone ?? booking.adminMeta?.phone,
      govIdType: govIdType ?? booking.adminMeta?.govIdType,
      govIdNumber: govIdNumber ?? booking.adminMeta?.govIdNumber,
      amountPaid:
        typeof amountPaid === "number"
          ? amountPaid
          : booking.adminMeta?.amountPaid,
      paymentMode: paymentMode ?? booking.adminMeta?.paymentMode,
    };
    await booking.save();

    return res.json({
      ok: true,
      booking,
    });
  } catch (err) {
    console.error("updateBookingAdmin error:", err);
    return res.status(500).json({
      message: err.message || "Failed to update booking",
    });
  }
};



export const getBookingAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await Booking.findById(id)
      .populate("user", "name email phone createdAt")
      .populate("room", "name pricePerNight mealPrices") 
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (err) {
    console.error("getBookingAdmin error:", err);
    res.status(500).json({ message: "Failed to load booking details" });
  }
};



export const checkUserByPhoneAdmin = async (req, res) => {
  try {
    const phone = (req.params.phone || "")
      .replace(/\D/g, "")
      .slice(-10);

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        message: "Invalid phone number",
      });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.json({
        exists: false,
        message: "User not found",
      });
    }

    return res.json({
      exists: true,
      message: "User found",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        dob: user.dob,
        phone: user.phone,
        profileComplete: user.profileComplete,
      },
    });
  } catch (err) {
    console.error("checkUserByPhoneAdmin error:", err);
    return res.status(500).json({
      message: "Failed to check user",
    });
  }
};
