import Razorpay from "razorpay";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";

const rp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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


export const verifyVillaPayment = async (req, res) => {
  try {
    const userId = req.body.userId || req.user?.id;
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
      govIdType,
      govIdNumber,
      paymentMode,
    } = req.body || {};

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    const nights = Math.max(1, Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)));
    const amountINR = nights * Number(customAmount);

    if (paymentMode === "Cash") {
      const booking = await Booking.create({
        user: userId,
        startDate: sDate,
        endDate: eDate,
        guests,
        withMeal: false,
        contactName,
        contactEmail,
        contactPhone,
        currency: "INR",
        pricePerNight: Number(customAmount),
        nights,
        amount: amountINR,
        status: "confirmed",
        paymentProvider: "offline",
        isVilla: true,
        adminMeta: {
          fullName: contactName,
          phone: contactPhone,
          govIdType,
          govIdNumber,
          amountPaid: amountINR,
          paymentMode: "Cash",
        },
      });
      return res.json({ ok: true, booking });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    console.log("🔍 Signature verify:", { expected, got: razorpay_signature });

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Signature mismatch" });
    }

    const booking = await Booking.create({
      user: userId,
      startDate: sDate,
      endDate: eDate,
      guests,
      withMeal: false,
      contactName,
      contactEmail,
      contactPhone,
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
      adminMeta: {
        fullName: contactName,
        phone: contactPhone,
        govIdType,
        govIdNumber,
        amountPaid: amountINR,
        paymentMode: paymentMode === "Cash" ? "Cash" : "Online",
      },
    });

    res.json({ ok: true, booking });
  } catch (err) {
    console.error("verifyVillaPayment error:", err);
    res.status(400).json({ message: err?.message || "Villa payment verification failed" });
  }
};
