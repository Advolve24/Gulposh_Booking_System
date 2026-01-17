import Razorpay from "razorpay";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";

const rp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const nightsBetween = (start, end) => {
  if (!start || !end) return 1;

  const s = new Date(start);
  const e = new Date(end);

  if (isNaN(s) || isNaN(e)) return 1;

  const sUTC = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  const eUTC = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());

  return Math.max(1, Math.round((eUTC - sUTC) / (1000 * 60 * 60 * 24)));
};

const daysDiff = (from, to) =>
  Math.ceil(
    (new Date(to).setHours(0, 0, 0, 0) -
      new Date(from).setHours(0, 0, 0, 0)) /
      86400000
  );


export const createAdminOrder = async (req, res) => {
  try {
    const {
      userId,
      roomId,
      startDate,
      endDate,
      guests = 1,
      withMeal = false,
      customAmount,
      contactName,
      contactEmail,
      contactPhone,
    } = req.body || {};

    if (!userId || !startDate || !endDate) {
      return res.status(400).json({
        message: "userId, startDate, endDate are required",
      });
    }

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    if (isNaN(sDate) || isNaN(eDate)) {
      return res.status(400).json({ message: "Invalid dates" });
    }

    const nights = nightsBetween(sDate, eDate);

    const room = roomId
      ? await Room.findById(roomId)
      : await Room.findOne({ name: /villa/i });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const pricePerNight =
      customAmount && Number(customAmount) > 0
        ? Number(customAmount)
        : withMeal && room.priceWithMeal > 0
        ? room.priceWithMeal
        : room.pricePerNight;

    const roomTotal = nights * pricePerNight;
    const amountPaise = Math.round(roomTotal * 100);

    const order = await rp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `adm_${Date.now()}`,
      notes: {
        userId,
        roomId: room._id.toString(),
        nights,
        pricePerNight,
        roomTotal,
        guests,
        withMeal,
        contactName: contactName || "",
        contactEmail: contactEmail || "",
        contactPhone: contactPhone || "",
      },
    });

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      computed: {
        nights,
        pricePerNight,
        roomTotal,
      },
    });
  } catch (err) {
    console.error("createAdminOrder error:", err);
    res.status(400).json({
      message: err?.message || "Failed to create admin order",
    });
  }
};


export const verifyAdminPayment = async (req, res) => {
  try {
    const {
      userId,
      roomId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      startDate,
      endDate,
      guests = 1,
      withMeal = false,
      contactName,
      contactEmail,
      contactPhone,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment payload" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Signature mismatch" });
    }

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    if (isNaN(sDate) || isNaN(eDate)) {
      return res.status(400).json({ message: "Invalid dates" });
    }

    const nights = nightsBetween(sDate, eDate);

    const room = roomId
      ? await Room.findById(roomId)
      : await Room.findOne({ name: /villa/i });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const pricePerNight =
      withMeal && room.priceWithMeal > 0
        ? room.priceWithMeal
        : room.pricePerNight;

    const vegPrice = Number(room.mealPriceVeg || 0);
    const nonVegPrice = Number(room.mealPriceNonVeg || 0);

    const roomTotal = nights * pricePerNight;

    const booking = await Booking.create({
      user: userId,
      room: room._id,

      startDate: sDate,
      endDate: eDate,
      nights,

      guests: Number(guests),

      pricePerNight,
      roomTotal,

      withMeal: !!withMeal,
      vegGuests: 0,
      nonVegGuests: 0,
      mealMeta: {
        vegPrice,
        nonVegPrice,
      },
      mealTotal: 0,

      amount: roomTotal,
      currency: "INR",

      contactName: contactName || "",
      contactEmail: contactEmail || "",
      contactPhone: contactPhone || "",

      status: "confirmed",
      paymentProvider: "razorpay",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    res.json({ ok: true, booking });
  } catch (err) {
    console.error("verifyAdminPayment error:", err);
    res.status(400).json({
      message: err?.message || "Admin payment verification failed",
    });
  }
};

/* ======================================================
   ADMIN CANCEL / RESCHEDULE (NEW)
===================================================== */

export const adminActionBooking = async (req, res) => {

  if (booking.status === "cancelled") {
  return res.json({
    ok: true,
    message: "Booking already cancelled",
    booking,
  });
}

  try {
    const { bookingId } = req.params;
    const {
      actionType, // cancel | reschedule
      reasonType, // user_request | maintenance
      note,

      newStartDate,
      newEndDate,

      refundPercentage,
      refundAmount,
    } = req.body || {};

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const now = new Date();

    /* ================= RESCHEDULE ================= */
    if (actionType === "reschedule") {
      if (reasonType !== "maintenance") {
        return res.status(400).json({
          message: "Reschedule allowed only for maintenance",
        });
      }

      const ns = new Date(newStartDate);
      const ne = new Date(newEndDate);

      if (isNaN(ns) || isNaN(ne)) {
        return res.status(400).json({ message: "Invalid new dates" });
      }

      const oldStart = booking.startDate;
      const oldEnd = booking.endDate;

      const newNights = nightsBetween(ns, ne);

      booking.startDate = ns;
      booking.endDate = ne;
      booking.nights = newNights;
      booking.roomTotal = newNights * booking.pricePerNight;
      booking.amount = booking.roomTotal + booking.mealTotal;

      booking.adminAction = {
        actionType: "reschedule",
        reasonType: "maintenance",
        note,
        actedAt: now,
        reschedule: {
          oldStartDate: oldStart,
          oldEndDate: oldEnd,
          newStartDate: ns,
          newEndDate: ne,
          nights: newNights,
        },
      };

      await booking.save();

      return res.json({
        ok: true,
        message: "Booking rescheduled due to maintenance",
        booking,
      });
    }

    /* ================= CANCEL ================= */
    if (actionType === "cancel") {
      let finalRefundAmount = 0;
      let finalRefundPercentage = 0;

      if (reasonType === "maintenance") {
        finalRefundPercentage = 100;
        finalRefundAmount = booking.amount;
      } else {
        if (typeof refundAmount === "number") {
          finalRefundAmount = refundAmount;
          finalRefundPercentage = Math.round(
            (refundAmount / booking.amount) * 100
          );
        } else if (typeof refundPercentage === "number") {
          finalRefundPercentage = refundPercentage;
          finalRefundAmount = Math.round(
            (booking.amount * refundPercentage) / 100
          );
        }
      }

      booking.status = "cancelled";
      booking.cancellation = {
        cancelledAt: now,
        cancelledBy: "admin",
        reason: note,
        daysBeforeCheckIn: daysDiff(now, booking.startDate),
        refundPercentage: finalRefundPercentage,
        refundAmount: finalRefundAmount,
        refundStatus:
          finalRefundAmount > 0 ? "pending" : "rejected",
      };

      booking.adminAction = {
        actionType: "cancel",
        reasonType,
        note,
        actedAt: now,
      };

      await booking.save();

      return res.json({
        ok: true,
        message: "Booking cancelled by admin",
        booking,
      });
    }

    res.status(400).json({ message: "Invalid actionType" });
  } catch (err) {
    console.error("adminActionBooking error:", err);
    res.status(500).json({
      message: err?.message || "Admin action failed",
    });
  }
};