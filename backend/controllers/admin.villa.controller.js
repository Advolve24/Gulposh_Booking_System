import Razorpay from "razorpay";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";

const rp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/** ✅ Utility: Calculate nights between two date-like values (ISO or Date) */
function nightsBetween(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e)) return 0;

  const sUTC = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
  const eUTC = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  const diff = eUTC - sUTC;
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/** ✅ Create Villa Order (Admin or User flow) */
export const createVillaOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });

    const {
      startDate,
      endDate,
      guests,
      customAmount,
      contactName,
      contactEmail,
      contactPhone,
    } = req.body || {};

    if (!startDate || !endDate || !guests || !customAmount) {
      return res
        .status(400)
        .json({ message: "startDate, endDate, guests, customAmount are required" });
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
        startDate,
        endDate,
        guests: String(guests),
        customAmount: String(customAmount),
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
      computed: { nights, customAmount, amountINR },
    });
  } catch (err) {
    console.error("createVillaOrder error:", err);
    res
      .status(400)
      .json({ message: err?.error?.description || err?.message || "Failed to create villa order" });
  }
};

/** ✅ Verify Villa Payment & Create Booking */
export const verifyVillaPayment = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      startDate,
      endDate,
      guests,
      customAmount,
      contactName,
      contactEmail,
      contactPhone,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment payload" });
    }

    // ✅ Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Signature mismatch" });
    }

    // ✅ Parse dates safely
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    if (isNaN(sDate) || isNaN(eDate)) {
      console.error("❌ Invalid incoming dates:", startDate, endDate);
      throw new Error(`Invalid start or end date: ${startDate}, ${endDate}`);
    }

    const nights = nightsBetween(sDate, eDate);
    if (!nights) throw new Error("Invalid or zero-night date range");

    const amountINR = nights * Number(customAmount);

    // ✅ Save booking
    const booking = await Booking.create({
      user: userId,
      room: null,
      startDate: sDate,
      endDate: eDate,
      guests: Number(guests),
      withMeal: false,
      contactName: contactName || "",
      contactEmail: contactEmail || "",
      contactPhone: contactPhone || "",
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

    console.log("✅ Booking created successfully:", booking._id);

    res.json({ ok: true, booking });
  } catch (err) {
    console.error("verifyVillaPayment error:", err);
    res.status(400).json({
      message: err?.message || "Villa payment verification failed",
    });
  }
};
