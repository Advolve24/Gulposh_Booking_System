import Razorpay from "razorpay";
import crypto from "crypto";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import TaxSetting from "../models/TaxSetting.js";
import { sendBookingConfirmationMail } from "../utils/mailer.js";
import { parseYMD, toDateOnly } from "../lib/date.js";
import { notifyAdmin } from "../utils/notifyAdmin.js"; // ✅ NEW


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

const computeTax = ({ roomTotal, mealTotal, withMeal, taxSetting }) => {
  const config = withMeal
    ? taxSetting.withFood
    : taxSetting.withoutFood;

  const stayTax = (roomTotal * config.stayTaxPercent) / 100;
  const foodTax = withMeal
    ? (mealTotal * config.foodTaxPercent) / 100
    : 0;

  const totalTax = stayTax + foodTax;

  return {
    stayTax: Math.round(stayTax),
    foodTax: Math.round(foodTax),
    totalTax: Math.round(totalTax),
  };
};


/* ============================= CREATE ORDER ============================= */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Auth required" });
    }

    const {
      roomId,
      startDate,
      endDate,
      guests,
      adults,
      children = 0,
      withMeal,
      vegGuests = 0,
      nonVegGuests = 0,
    } = req.body;

    if (!guests || !adults || adults < 1) {
      return res.status(400).json({ message: "Invalid guest data" });
    }

    if (adults + children !== guests) {
      return res.status(400).json({
        message: "Guests count mismatch (adults + children)",
      });
    }

    if (!roomId || !startDate || !endDate || !guests) {
      return res.status(400).json({ message: "Missing booking fields" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const sDate = parseYMD(startDate);
    const eDate = parseYMD(endDate);

    const nights = nightsBetween(sDate, eDate);
    if (nights <= 0) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const taxSetting = await TaxSetting.findOne({ isActive: true });
    if (!taxSetting) {
      return res.status(500).json({ message: "Tax configuration missing" });
    }

    const { stayTax, foodTax, totalTax } = computeTax({
      roomTotal,
      mealTotal,
      withMeal,
      taxSetting,
    });

    const subTotal = roomTotal + mealTotal;
    const grandTotal = subTotal + totalTax;
    const amountPaise = Math.round(grandTotal * 100);
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

       /* ✅ frontend display */
      nights,
      roomTotal,
      mealTotal,
      stayTax,
      foodTax,
      totalTax,
      subTotal,
      grandTotal,
    });
  } catch (err) {
    console.error("❌ createOrder error:", err);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

/* ============================= VERIFY PAYMENT ============================= */
export const verifyPayment = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Auth required" });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      roomId,
      startDate,
      endDate,
      guests,
      adults,
      children = 0,
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


    if (!guests || !adults || adults < 1) {
      return res.status(400).json({ message: "Invalid guest data" });
    }

    if (adults + children !== guests) {
      return res.status(400).json({
        message: "Guests count mismatch (adults + children)",
      });
    }

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({ message: "Invalid payment payload" });
    }

    /* ---------------- Verify Razorpay Signature ---------------- */
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
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
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

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

    const taxSetting = await TaxSetting.findOne({ isActive: true });
    if (!taxSetting) {
      return res.status(500).json({ message: "Tax configuration missing" });
    }

    const { stayTax, foodTax, totalTax } = computeTax({
      roomTotal,
      mealTotal,
      withMeal,
      taxSetting,
    });

    const subTotal = roomTotal + mealTotal;
    const grandTotal = subTotal + totalTax;

    /* ---------------- Create Booking ---------------- */
    const booking = await Booking.create({
      user: userId,
      room: room._id,
      startDate: sDate,
      endDate: eDate,
      nights,
      guests,
      adults,
      children,
      pricePerNight: room.pricePerNight,
      roomTotal,
      withMeal: !!withMeal,
      vegGuests,
      nonVegGuests,
      mealTotal,
      stayTax,
      foodTax,
      totalTax,
      subTotal,
      amount: grandTotal,
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

    /* 🔔 NOTIFY ADMIN — BOOKING CONFIRMED */
    await notifyAdmin("BOOKING_CREATED", {
      bookingId: booking._id,
      room: room.name,
      guest: contactName,
      guests,
      amount: grandTotal,
      dates: `${startDate} → ${endDate}`,
      paymentProvider: "razorpay",
    });
    
   /* ---------------- Send Confirmation Mail ---------------- */
    const emailToSend = contactEmail || req.user?.email;

    if (emailToSend) {
      sendBookingConfirmationMail({
        to: emailToSend,
        name: contactName,
        booking,
        room,
      })
        .then(() => {
          console.log("✅ Confirmation mail queued:", emailToSend);
        })
        .catch((err) => {
          console.error("❌ Mail error:", err.message);
        });
    }
    else {
      console.warn("⚠️ No email found to send booking confirmation");
    }

    return res.json({ ok: true, booking });
  } catch (err) {
    console.error("❌ verifyPayment error:", err);
    return res
      .status(500)
      .json({ message: "Payment verification failed" });
  }
};
