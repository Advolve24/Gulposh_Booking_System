import Razorpay from "razorpay";
import crypto from "crypto";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import { sendWhatsAppText, sendWhatsAppTemplate } from "../utils/whatsapp.js";
import { sendBookingConfirmationMail } from "../utils/mailer.js";
import { parseYMD } from "../lib/date.js";

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

function toUTCDateOnly(d) {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}


export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Auth required" });

    const { roomId, startDate, endDate, guests, withMeal, contactName, contactEmail, contactPhone } = req.body || {};
    if (!roomId || !startDate || !endDate || !guests) {
      return res.status(400).json({ message: "roomId, startDate, endDate, guests are required" });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const nights = nightsBetween(startDate, endDate);
    if (!nights) return res.status(400).json({ message: "Invalid date range" });
    const pricePerNight = withMeal && room.priceWithMeal > 0 ? room.priceWithMeal : room.pricePerNight;
    const amountINR = nights * pricePerNight;
    const amountPaise = Math.round(amountINR * 100);

    const shortId = String(room._id).slice(-6);
    const shortTs = Date.now().toString(36);
    const receipt = `r_${shortId}_${shortTs}`.slice(0, 40);

    console.log("[rzp] receipt:", receipt, "len:", receipt.length);

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
        withMeal: String(!!withMeal),
        contactName: contactName || "",
        contactEmail: contactEmail || "",
        contactPhone: contactPhone || "",
        pricePerNight: String(pricePerNight),
        nights: String(nights),
        amountINR: String(amountINR),
      },
    };

    console.log("[rzp] order payload:", { ...payload, notes: "(omitted in log)" });

    const order = await rp.orders.create(payload);

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      computed: { nights, pricePerNight, amountINR },
    });
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(400).json({ message: err?.error?.description || err?.message || "Failed to create order" });
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

    const sDate = parseYMD(startDate);
    const eDate = parseYMD(endDate);

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const nights = (eDate - sDate) / (1000 * 60 * 60 * 24);
    if (nights <= 0) return res.status(400).json({ message: "Invalid date range" });

    const pricePerNight =
      withMeal && room.priceWithMeal > 0
        ? room.priceWithMeal
        : room.pricePerNight;
    const amountINR = nights * pricePerNight;

    const booking = await Booking.create({
      user: userId,
      room: room._id,
      startDate: sDate,
      endDate: eDate,
      guests,
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
      addressInfo: {
        address: req.body.address,
        country: req.body.country,
        state: req.body.state,
        city: req.body.city,
        pincode: req.body.pincode,
      },
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
      console.error("Booking confirmation email failed:", mailErr?.message);
    }

    res.json({ ok: true, booking });
  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(400).json({ message: err?.message || "Verification failed" });
  }
};

