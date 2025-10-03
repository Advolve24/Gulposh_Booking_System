import Booking from "../models/Booking.js";

export const getMyBookings = async (req, res) => {
  const items = await Booking.find({ user: req.user.id })
    .populate("room", "name coverImage pricePerNight priceWithMeal")
    .sort({ startDate: 1 });
  res.json(items);
};

export const getBooking = async (req, res) => {
  const b = await Booking.findOne({ _id: req.params.id, user: req.user.id })
    .populate("room", "name coverImage pricePerNight priceWithMeal description");
  if (!b) return res.status(404).json({ message: "Booking not found" });
  res.json(b);
};

export const cancelMyBooking = async (req, res) => {
  const b = await Booking.findOne({ _id: req.params.id, user: req.user.id });
  if (!b) return res.status(404).json({ message: "Booking not found" });

  if (new Date(b.startDate) <= new Date()) {
    return res.status(400).json({ message: "Stay already started; cannot cancel" });
  }
  if (b.status === "cancelled") {
    return res.json({ ok: true, booking: b });
  }

  b.status = "cancelled";
  await b.save();
  res.json({ ok: true, booking: b });
};
