// controllers/admin.villa.controller.js
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";

const nightsBetween = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const ms = new Date(e.getFullYear(), e.getMonth(), e.getDate()) -
             new Date(s.getFullYear(), s.getMonth(), s.getDate());
  return Math.max(1, ms / (1000 * 60 * 60 * 24));
};

export const createVillaBooking = async (req, res) => {
  try {
    const { userId, startDate, endDate, guests, customAmount, contactName, contactEmail, contactPhone } = req.body;

    if (!userId || !startDate || !endDate || !customAmount) {
      return res.status(400).json({ message: "userId, startDate, endDate, customAmount are required" });
    }

    // find special villa room
    const villaRoom = await Room.findOne({ name: "Entire Villa" });
    if (!villaRoom) return res.status(400).json({ message: "Villa room not configured" });

    const nights = nightsBetween(startDate, endDate);
    const pricePerNight = Number(customAmount); // dynamic amount per night
    const amount = pricePerNight * nights;

    const booking = await Booking.create({
      user: userId,
      room: villaRoom._id,
      startDate,
      endDate,
      guests,
      withMeal: false,
      contactName,
      contactEmail,
      contactPhone,
      currency: "INR",
      pricePerNight,
      nights,
      amount,
      status: "confirmed",
      paymentProvider: "offline"
    });

    res.json({ ok: true, booking });
  } catch (err) {
    res.status(400).json({ message: err.message || "Failed to create villa booking" });
  }
};
