import Razorpay from "razorpay";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import  { toDateOnlyUTC } from "../lib/date.js";

const rp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const toDateOnly = (d) => {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
};
const nightsBetween = (start, end) => {
  const ms = toDateOnly(end) - toDateOnly(start);
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
};

export const createVillaOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });

    const { startDate, endDate, guests, customAmount, contactName, contactEmail, contactPhone } = req.body || {};
    if (!startDate || !endDate || !guests || !customAmount) {
      return res.status(400).json({ message: "startDate, endDate, guests, customAmount are required" });
    }

    const nights = nightsBetween(startDate, endDate);
    if (!nights) return res.status(400).json({ message: "Invalid date range" });

    const amountINR = nights * Number(customAmount);
    const amountPaise = Math.round(amountINR * 100);

    const receipt = `villa_${Date.now().toString(36)}`;

    const order = await rp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        userId: String(userId),
        isVilla: "true",
        startDate: toDateOnlyUTC(startDate).toISOString(),
        endDate: toDateOnlyUTC(endDate).toISOString(),
        guests: String(guests),
        customAmount: String(customAmount),
        contactName: contactName || "",
        contactEmail: contactEmail || "",
        contactPhone: contactPhone || ""
      }
    });

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      computed: { nights, customAmount, amountINR },
    });
  } catch (err) {
    console.error("createVillaOrder error:", err);
    res.status(400).json({ message: err?.error?.description || err?.message || "Failed to create villa order" });
  }
};


export const verifyVillaPayment = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      startDate, endDate, guests, customAmount,
      contactName, contactEmail, contactPhone
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

    const nights = nightsBetween(startDate, endDate);
    const amountINR = nights * Number(customAmount);

    const booking = await Booking.create({
      user: userId,
      room: null,
      startDate: toDateOnlyUTC(startDate),
      endDate: toDateOnlyUTC(endDate),
      guests,
      withMeal: false,
      contactName, contactEmail, contactPhone,
      currency: "INR",
      pricePerNight: Number(customAmount),
      nights,
      amount: amountINR,
      status: "confirmed",
      paymentProvider: "razorpay",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      isVilla: true,
    });

    res.json({ ok: true, booking });
  } catch (err) {
    console.error("verifyVillaPayment error:", err);
    res.status(400).json({ message: err?.message || "Villa payment verification failed" });
  }
};
