import Razorpay from "razorpay";
import crypto from "crypto";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import TaxSetting from "../models/TaxSetting.js";
import { sendBookingConfirmationMail } from "../utils/mailer.js";
import { parseYMD, toDateOnly } from "../lib/date.js";
import { notifyAdmin } from "../utils/notifyAdmin.js";
import User from "../models/User.js";


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
      couponCode,
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

    const roomTotal = nights * room.pricePerNight;

    const mealTotal = withMeal
      ? nights *
      (vegGuests * room.mealPriceVeg +
        nonVegGuests * room.mealPriceNonVeg)
      : 0;

    let subTotal = roomTotal + mealTotal;

    let discountAmount = 0;

    const validCoupon =
      couponCode &&
      room.discountCode &&
      couponCode.trim().toUpperCase() ===
      room.discountCode.trim().toUpperCase();

    if (validCoupon) {
      if (room.discountType === "percent") {
        discountAmount = Math.round(
          (subTotal * room.discountValue) / 100
        );
      } else if (room.discountType === "flat") {
        discountAmount = room.discountValue;
      }
    }
    const discountedSubtotal = Math.max(
      0,
      subTotal - discountAmount
    );

    const taxSetting = await TaxSetting.findOne();
    if (!taxSetting) {
      return res.status(500).json({ message: "Tax configuration missing" });
    }

    const cgstPercent = taxSetting.taxPercent / 2;
    const sgstPercent = taxSetting.taxPercent / 2;

    const cgstAmount = Math.round(
      (discountedSubtotal * cgstPercent) / 100
    );
    const sgstAmount = Math.round(
      (discountedSubtotal * sgstPercent) / 100
    );

    const totalTax = cgstAmount + sgstAmount;

    const grandTotal = discountedSubtotal + totalTax;

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
      nights,
      roomTotal,
      mealTotal,
      subTotal,
      cgstPercent,
      sgstPercent,
      cgstAmount,
      sgstAmount,
      totalTax,
      grandTotal,
      discountAmount,
      discountedSubtotal,
    });
  } catch (err) {
    console.error("❌ createOrder error:", err);
    return res.status(500).json({ message: "Failed to create order" });
  }
};


export const verifyPayment = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
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
      couponCode
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

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Signature mismatch" });
    }

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
    let mealTotal = 0;

    if (room.mealMode === "only") {
      mealTotal = 0;
    }

    if (room.mealMode === "price" && withMeal) {
      mealTotal =
        nights *
        (vegGuests * room.mealPriceVeg +
          nonVegGuests * room.mealPriceNonVeg);
    }

    const subTotal = roomTotal + mealTotal;

    let discountAmount = 0;

    const validCoupon =
      couponCode &&
      room.discountCode &&
      couponCode.trim().toUpperCase() ===
      room.discountCode.trim().toUpperCase();

    if (validCoupon) {
      if (room.discountType === "percent") {
        discountAmount = Math.round(
          (subTotal * room.discountValue) / 100
        );
      } else if (room.discountType === "flat") {
        discountAmount = room.discountValue;
      }
    }

    const discountedSubtotal = Math.max(
      0,
      subTotal - discountAmount
    );

    const taxSetting = await TaxSetting.findOne();
    if (!taxSetting) {
      return res.status(500).json({ message: "Tax configuration missing" });
    }

    const cgstPercent = taxSetting.taxPercent / 2;
    const sgstPercent = taxSetting.taxPercent / 2;

    const cgstAmount = Math.round(
      (discountedSubtotal * cgstPercent) / 100
    );

    const sgstAmount = Math.round(
      (discountedSubtotal * sgstPercent) / 100
    );

    const totalTax = cgstAmount + sgstAmount;

    const grandTotal = discountedSubtotal + totalTax;

    const overlap = await Booking.findOne({
      room: room._id,
      status: { $ne: "cancelled" },
      startDate: { $lt: eDate },
      endDate: { $gt: sDate },
    });

    if (overlap) {
      return res.status(409).json({
        message: "Room just got booked by another guest. Payment will be refunded.",
      });
    }

    const booking = await Booking.create({
      user: userId,
      userSnapshot: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
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
      taxBreakup: {
        cgstPercent,
        sgstPercent,
        cgstAmount,
        sgstAmount,
        totalTax,
      },
      discountMeta:
        discountAmount > 0
          ? {
            discountType: room.discountType,
            discountValue: room.discountValue,
            discountAmount,
          }
          : null,
      subTotal: discountedSubtotal,
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

    try {
      await notifyAdmin("BOOKING_CREATED", {
        bookingId: booking._id,
        room: room.name,
        guest: contactName,
        guests,
        amount: grandTotal,
        dates: `${startDate} → ${endDate}`,
        paymentProvider: "razorpay",
      });
    } catch (err) {
      console.error("❌ notifyAdmin failed:", err.message);
    }


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
