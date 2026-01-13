import Booking from "../models/Booking.js";

/* ================================
   HELPERS
================================ */

const nightsBetween = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
};

/* ================================
   GET MY BOOKINGS (LIST VIEW)
================================ */
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate("user", "name email phone")
      .populate(
        "room",
        "name coverImage pricePerNight maxGuests"
      )
      .sort({ startDate: 1 });

    const items = bookings.map((b) => ({
      _id: b._id,
      status: b.status,
      startDate: b.startDate,
      endDate: b.endDate,
      guests: b.guests,
      amount: b.amount,
      nights: nightsBetween(b.startDate, b.endDate),
      room: b.room,
      createdAt: b.createdAt,
    }));

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "Failed to load bookings" });
  }
};

/* ================================
   GET SINGLE BOOKING (VIEW POPUP)
================================ */
export const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id,
    })
      .populate("user", "name email phone")
      .populate(
        "room",
        `
          name
          description
          coverImage
          pricePerNight
          mealPriceVeg
          mealPriceNonVeg
          maxGuests
        `
      );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const nights = nightsBetween(
      booking.startDate,
      booking.endDate
    );

    res.json({
      _id: booking._id,
      status: booking.status,

      /* STAY */
      startDate: booking.startDate,
      endDate: booking.endDate,
      nights,

      /* GUESTS */
      guests: booking.guests,
      vegGuests: booking.vegGuests || 0,
      nonVegGuests: booking.nonVegGuests || 0,
      comboGuests: booking.comboGuests || 0,

      /* ROOM */
      room: booking.room,

      /* USER */
      user: booking.user,

      /* PRICING */
      pricePerNight: booking.pricePerNight,
      roomTotal: booking.roomTotal,
      mealTotal: booking.mealTotal,
      amount: booking.amount,
      currency: booking.currency || "INR",

      /* PAYMENT */
      paymentProvider: booking.paymentProvider,
      orderId: booking.orderId,
      paymentId: booking.paymentId,

      /* META */
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load booking" });
  }
};

/* ================================
   CANCEL BOOKING
================================ */
export const cancelMyBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (new Date(booking.startDate) <= new Date()) {
      return res.status(400).json({
        message: "Stay already started; cannot cancel",
      });
    }

    if (booking.status === "cancelled") {
      return res.json({ ok: true, booking });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ ok: true, booking });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel booking" });
  }
};
