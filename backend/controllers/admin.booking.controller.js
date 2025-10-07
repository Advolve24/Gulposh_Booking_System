import Razorpay from "razorpay";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import { toDateOnlyUTC } from "../lib/date.js";

const rp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const nightsBetween = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e)) return 0;

  const sUTC = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
  const eUTC = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  const diff = eUTC - sUTC;
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
};



export const createAdminOrder = async (req, res) => {
  try {
    const {
      userId,
      roomId,
      startDate,
      endDate,
      guests,
      withMeal,
      customAmount, 
      contactName,
      contactEmail,
      contactPhone,
    } = req.body || {};

    if (!userId || !startDate || !endDate) {
      return res.status(400).json({ message: "userId, startDate, endDate are required" });
    }

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    if (isNaN(sDate) || isNaN(eDate)) {
      throw new Error(`Invalid start or end date: ${startDate}, ${endDate}`);
    }

    const nights = nightsBetween(sDate, eDate);
    if (!nights) return res.status(400).json({ message: "Invalid date range" });

    let room = null;
    if (roomId) {
      room = await Room.findById(roomId);
    } else {
      room =
        (await Room.findOne({ name: /entire villa/i })) ||
        (await Room.findOne({ type: "villa" }));
    }
    if (!room) throw new Error("Room not found or Villa not configured");

    const pricePerNight =
      customAmount && Number(customAmount) > 0
        ? Number(customAmount)
        : withMeal && room.priceWithMeal > 0
        ? room.priceWithMeal
        : room.pricePerNight;

    const amountINR = nights * pricePerNight;
    const amountPaise = Math.round(amountINR * 100);
    const receipt = `adm_${Date.now().toString(36)}_${room._id.toString().slice(-6)}`;

    const order = await rp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        userId: String(userId),
        roomId: String(room._id),
        startDate: sDate.toISOString(),
        endDate: eDate.toISOString(),
        guests: String(guests || 1),
        withMeal: String(!!withMeal),
        contactName: contactName || "",
        contactEmail: contactEmail || "",
        contactPhone: contactPhone || "",
        pricePerNight: String(pricePerNight),
        nights: String(nights),
        amountINR: String(amountINR),
      },
    });

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      computed: { nights, pricePerNight, amountINR },
    });
  } catch (err) {
    console.error("createAdminOrder error:", err);
    res
      .status(400)
      .json({ message: err?.error?.description || err?.message || "Failed to create admin order" });
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
      guests,
      withMeal,
      customAmount,
      contactName,
      contactEmail,
      contactPhone,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment payload" });
    }

    // Verify signature integrity
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
    if (isNaN(sDate) || isNaN(eDate)) throw new Error(`Invalid start or end date`);

    const nights = nightsBetween(sDate, eDate);

    let room = null;
    if (roomId) {
      room = await Room.findById(roomId);
    } else {
      room =
        (await Room.findOne({ name: /entire villa/i })) ||
        (await Room.findOne({ type: "villa" }));
    }
    if (!room) throw new Error("Room not found or Villa not configured");

    const pricePerNight =
      customAmount && Number(customAmount) > 0
        ? Number(customAmount)
        : withMeal && room.priceWithMeal > 0
        ? room.priceWithMeal
        : room.pricePerNight;

    const amountINR = nights * pricePerNight;

    const booking = await Booking.create({
      user: userId,
      room: room._id,
      startDate: sDate,
      endDate: eDate,
      guests: Number(guests) || 1,
      withMeal: !!withMeal,
      contactName: contactName || "",
      contactEmail: contactEmail || "",
      contactPhone: contactPhone || "",
      currency: "INR",
      pricePerNight,
      nights,
      amount: amountINR,
      status: "confirmed",
      paymentProvider: "razorpay",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    res.json({ ok: true, booking });
  } catch (err) {
    console.error("verifyAdminPayment error:", err);
    res.status(400).json({ message: err?.message || "Admin payment verification failed" });
  }
};
