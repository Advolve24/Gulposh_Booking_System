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
