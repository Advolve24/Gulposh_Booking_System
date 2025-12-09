// controllers/paymentController.js

import Razorpay from "razorpay";
import crypto from "crypto";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import { sendWhatsAppText, sendWhatsAppTemplate } from "../utils/whatsapp.js";
import { sendBookingConfirmationMail } from "../utils/mailer.js";
import { parseYMD } from "../lib/date.js";

/* ----------------------------- Initialize Razorpay ----------------------------- */
const rp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ----------------------------- Helper Functions ----------------------------- */
const toDateOnly = (d) => {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
};

const nightsBetween = (start, end) => {
  const ms = toDateOnly(end) - toDateOnly(start);
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
};


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
      vegGuests,
      nonVegGuests,
      comboGuests,
      contactName,
      contactEmail,
      contactPhone,
    } = req.body || {};

    if (!roomId || !startDate || !endDate || !guests) {
      return res.status(400).json({
        message: "roomId, startDate, endDate, guests are required",
      });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const nights = nightsBetween(startDate, endDate);
    if (!nights) return res.status(400).json({ message: "Invalid date range" });

    let mealTotal = 0;

    if (withMeal) {
      mealTotal =
        nights *
          (vegGuests * room.mealPriceVeg +
            nonVegGuests * room.mealPriceNonVeg) +
        comboGuests * room.mealPriceCombo;
    }

    const roomTotal = nights * room.pricePerNight;
    const amountINR = roomTotal + mealTotal;
    const amountPaise = Math.round(amountINR * 100);

    const shortId = String(room._id).slice(-6);
    const shortTs = Date.now().toString(36);
    const receipt = `r_${shortId}_${shortTs}`.substring(0, 40);

    const payload = {
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        roomId: String(room._id),
        userId: String(userId),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        guests: String(guests),
        vegGuests: String(vegGuests),
        nonVegGuests: String(nonVegGuests),
        comboGuests: String(comboGuests),
        mealTotal: String(mealTotal),
        roomTotal: String(roomTotal),
        nights: String(nights),
        pricePerNight: String(room.pricePerNight),
        amountINR: String(amountINR),
        contactName: contactName || "",
        contactEmail: contactEmail || "",
        contactPhone: contactPhone || "",
      },
    };

    const order = await rp.orders.create(payload);

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      computed: { nights, pricePerNight: room.pricePerNight, amountINR },
    });
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(400).json({
      message:
        err?.error?.description || err?.message || "Failed to create order",
    });
  }
};



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
      vegGuests,
      nonVegGuests,
      comboGuests,
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

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Signature mismatch" });
    }

    const sDate = parseYMD(startDate);
    const eDate = parseYMD(endDate);

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const nights = nightsBetween(sDate, eDate);
    if (!nights) return res.status(400).json({ message: "Invalid date range" });

    const roomTotal = nights * room.pricePerNight;

    let mealTotal = 0;

    if (withMeal) {
      mealTotal =
        nights *
          (vegGuests * room.mealPriceVeg +
            nonVegGuests * room.mealPriceNonVeg) +
        comboGuests * room.mealPriceCombo;
    }

    const amountINR = roomTotal + mealTotal;

    const booking = await Booking.create({
      user: userId,
      room: room._id,
      startDate: sDate,
      endDate: eDate,
      guests,
      withMeal: !!withMeal,
      vegGuests,
      nonVegGuests,
      comboGuests,
      mealTotal,
      roomTotal,
      contactName: contactName || "",
      contactEmail: contactEmail || "",
      contactPhone: contactPhone || "",
      currency: "INR",
      pricePerNight: room.pricePerNight,
      nights,
      amount: amountINR,
      status: "confirmed",
      paymentProvider: "razorpay",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      addressInfo: { address, country, state, city, pincode },
    });

    const msg = `✅ Hi ${contactName}, your booking is confirmed!
🏠 Room: ${room.name}
📅 ${startDate} → ${endDate}
👥 Guests: ${guests}
💰 Amount: ₹${amountINR}`;

    const sent = await sendWhatsAppText(contactPhone, msg);
    if (!sent) await sendWhatsAppTemplate(contactPhone, "hello_world");

    try {
      await sendBookingConfirmationMail({
        to: contactEmail,
        name: contactName,
        room,
        booking,
      });
    } catch (mailErr) {
      console.error("Email failed:", mailErr?.message);
    }

    res.json({ ok: true, booking });
  } catch (err) {
    console.error("verifyPayment error:", err);
    res
      .status(400)
      .json({ message: err?.message || "Verification failed" });
  }
};
