import Booking from "../models/Booking.js";
import { notifyAdmin } from "../utils/notifyAdmin.js";


const nightsBetween = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
};

const daysBetweenDates = (from, to) => {
  const d1 = new Date(from);
  const d2 = new Date(to);

  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);

  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
};

const getRefundPolicy = (daysBeforeCheckIn) => {
  if (daysBeforeCheckIn >= 10) return 100;
  if (daysBeforeCheckIn >= 5) return 50;
  return 0;
};


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
      user: b.userSnapshot || b.user,
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
    mealMode
    maxGuests
  `
      )

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const nights = nightsBetween(
      booking.startDate,
      booking.endDate
    );

    const roomTotal = booking.roomTotal || 0;
    const mealTotal = booking.mealTotal || 0;
    const subtotal = roomTotal + mealTotal;
    const tax = booking.totalTax || 0;

    res.json({
      _id: booking._id,
      status: booking.status,

      startDate: booking.startDate,
      endDate: booking.endDate,
      nights,

      guests: booking.guests,
      adults: booking.adults || 0,
      children: booking.children || 0,

      vegGuests: booking.vegGuests || 0,
      nonVegGuests: booking.nonVegGuests || 0,

      withMeal: booking.withMeal,

      room: booking.room,
      user: booking.userSnapshot || booking.user,

      pricePerNight: booking.room?.pricePerNight || booking.pricePerNight || 0,

      paymentProvider: booking.paymentProvider,
      paymentId: booking.paymentId,

      roomTotal,
      mealTotal,
      subtotal,
      totalTax: tax,
      grandTotal: booking.amount,

      amount: booking.amount,

      contactName: booking.contactName,
      contactEmail: booking.contactEmail,
      contactPhone: booking.contactPhone,

      address: booking.addressInfo,

      createdAt: booking.createdAt,
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to load booking" });
  }
};


/* ======================================================
   CANCEL MY BOOKING
===================================================== */

export const cancelMyBooking = async (req, res) => {
  try {
    const { reason } = req.body || {};

    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.json({
        ok: true,
        booking,
        message: "Booking already cancelled",
      });
    }

    const today = new Date();
    const checkIn = new Date(booking.startDate);

    if (today >= checkIn) {
      return res.status(400).json({
        message: "Stay already started; cannot cancel",
      });
    }

    // 📆 Days before check-in
    const daysBeforeCheckIn = daysBetweenDates(today, checkIn);

    // 💰 Refund calculation
    const refundPercentage = getRefundPolicy(daysBeforeCheckIn);
    const refundAmount = Math.round(
      (booking.amount * refundPercentage) / 100
    );

    booking.status = "cancelled";
    booking.cancellation = {
      cancelledAt: today,
      cancelledBy: "user",
      reason: reason || "User cancelled booking",
      daysBeforeCheckIn,
      refundPercentage,
      refundAmount,
      refundStatus:
        refundPercentage > 0 ? "pending" : "rejected",
    };

    await booking.save();

    // Notify admin about cancellation
    await notifyAdmin("BOOKING_CANCELLED", {
      bookingId: booking._id,
      room: booking.room?.name,
      guest: booking.user?.name,
      refundAmount,
      refundPercentage,
      cancelledBy: "user",
    });


    res.json({
      ok: true,
      message: "Booking cancelled successfully",
      refund: {
        daysBeforeCheckIn,
        refundPercentage,
        refundAmount,
        refundStatus: booking.cancellation.refundStatus,
      },
      booking,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
};