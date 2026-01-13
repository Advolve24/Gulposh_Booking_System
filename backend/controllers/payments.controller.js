// controllers/paymentController.js

import Razorpay from "razorpay";
import crypto from "crypto";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import { sendWhatsAppText } from "../utils/whatsapp.js";
import { sendBookingConfirmationMail } from "../utils/mailer.js";
import { parseYMD, toDateOnly } from "../lib/date.js";

/* ----------------------------- Razorpay ----------------------------- */
const rp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ----------------------------- Helpers ----------------------------- */
const nightsBetween = (start, end) => {
  if (!start || !end) return 0;
  const s = toDateOnly(start);
  const e = toDateOnly(end);
  return Math.max(0, Math.round((e - s) / 86400000));
};

/* ============================= CREATE ORDER ============================= */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });

    const {
      roomId,
      startDate,
      endDate,
      guests,
      withMeal,
      vegGuests = 0,
      nonVegGuests = 0,
    } = req.body;

    if (!roomId || !startDate || !endDate || !guests) {
      return res.status(400).json({ message: "Missing booking fields" });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const sDate = parseYMD(startDate);
    const eDate = parseYMD(endDate);

    const nights = nightsBetween(sDate, eDate);
    if (nights <= 0) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const roomTotal = nights * room.pricePerNight;
    const mealTotal = withMeal
      ? nights *
      (vegGuests * room.mealPriceVeg +
        nonVegGuests * room.mealPriceNonVeg)
      : 0;

    const amountINR = roomTotal + mealTotal;
    const amountPaise = Math.round(amountINR * 100);

    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const order = await rp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `r_${roomId.slice(-6)}_${Date.now()}`,
    });

    return res.json({
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: "INR",
    });
  } catch (err) {
    console.error("createOrder error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/* ============================= VERIFY PAYMENT ============================= */
export const verifyPayment = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      roomId,
      startDate,
      endDate,
      guests,
      withMeal,
      vegGuests = 0,
      nonVegGuests = 0,
      contactName,
      contactEmail,
      contactPhone,
      address,
      country,
      state,
      city,
      pincode,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment payload" });
    }

    /* ---------------- Verify Razorpay Signature ---------------- */
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Signature mismatch" });
    }

    /* ---------------- Prevent Duplicate Booking ---------------- */
    const existing = await Booking.findOne({
      paymentId: razorpay_payment_id,
    });

    if (existing) {
      return res.json({ ok: true, booking: existing });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const sDate = parseYMD(startDate);
    const eDate = parseYMD(endDate);

    const nights = nightsBetween(sDate, eDate);
    if (!nights || nights <= 0) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const roomTotal = nights * room.pricePerNight;
    const mealTotal = withMeal
      ? nights *
      (vegGuests * room.mealPriceVeg +
        nonVegGuests * room.mealPriceNonVeg)
      : 0;

    const amountINR = roomTotal + mealTotal;

    /* ---------------- Create Booking ---------------- */
    const booking = await Booking.create({
      user: userId,
      room: room._id,
      startDate: sDate,
      endDate: eDate,
      nights,
      guests,
      pricePerNight: room.pricePerNight,
      roomTotal,
      withMeal: !!withMeal,
      vegGuests,
      nonVegGuests,
      mealTotal,
      amount: amountINR,
      currency: "INR",
      contactName,
      contactEmail,
      contactPhone,
      status: "confirmed",
      paymentProvider: "razorpay",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      addressInfo: { address, country, state, city, pincode },
    });

    /* ---------------- Notifications (Non-Blocking) ---------------- */

    // ✅ WhatsApp
    //     sendWhatsAppText(
    //       contactPhone,
    //       `✅ Hi ${contactName}, your booking is confirmed!
    // 🏠 ${room.name}
    // 📅 ${startDate} → ${endDate}
    // 👥 Guests: ${guests}
    // 💰 Amount: ₹${amountINR}`
    //     ).catch((err) => {
    //       console.error("WhatsApp failed:", err);
    //     });

    // ✅ Email
    const emailToSend =
      contactEmail ||
      req.user?.email ||
      null;

    sendBookingConfirmationMail({
      to: emailToSend,
      name: contactName,
      room,
      booking,
    });

    return res.json({ ok: true, booking });
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res
      .status(400)
      .json({ message: err?.message || "Verification failed" });
  }
};
