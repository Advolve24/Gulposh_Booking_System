import Razorpay from "razorpay";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import Enquiry from "../models/Enquiry.js";

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
    const {
      startDate,
      endDate,
      guests,
      adults,
      children,
      vegGuests,
      nonVegGuests,
      customAmount,
      contactName,
      contactEmail,
      contactPhone,
      userId,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User must be verified via OTP before booking",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({
        message: "Invalid user. OTP verification required.",
      });
    }

    if (!startDate || !endDate || !guests || !customAmount) {
      return res.status(400).json({
        message: "startDate, endDate, guests, customAmount are required",
      });
    }

    const totalGuests = Number(guests);

    const a = Number(adults || 0);
    const c = Number(children || 0);

    if (a + c !== totalGuests) {
      return res.status(400).json({
        message: "Adults + Children must equal total guests",
      });
    }

    if (a <= 0) {
      return res.status(400).json({
        message: "At least one adult is required",
      });
    }

    if (a < 0 || c < 0) {
      return res.status(400).json({
        message: "Invalid adults/children values",
      });
    }

    const veg = Number(vegGuests || 0);
    const nonVeg = Number(nonVegGuests || 0);

    if (veg + nonVeg !== totalGuests) {
      return res.status(400).json({
        message: "Veg + Non-Veg guests must equal total guests",
      });
    }

    if (
      totalGuests <= 0 ||
      veg < 0 ||
      nonVeg < 0 ||
      veg > totalGuests ||
      nonVeg > totalGuests
    ) {
      return res.status(400).json({
        message: "Invalid guest count values",
      });
    }

    const nights = nightsBetween(startDate, endDate);
    if (!nights) {
      return res.status(400).json({
        message: "Invalid date range",
      });
    }

    const amountINR = nights * Number(customAmount);
    const amountPaise = Math.round(amountINR * 100);
    const receipt = `villa_admin_${Date.now().toString(36)}`;

    const order = await rp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        userId: String(user._id),
        bookedByAdmin: "true",
        startDate,
        endDate,
        guests: String(guests),
        adults: String(adults),
        children: String(children),
        vegGuests,
        nonVegGuests,
        customAmount: String(customAmount),
        contactName,
        contactEmail,
        contactPhone,
      },
    });

    return res.json({
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      computed: {
        nights,
        customAmount,
        amountINR,
      },
      userId: user._id,
    });
  } catch (err) {
    console.error("createVillaOrder error:", err);

    return res.status(400).json({
      message:
        err?.error?.description ||
        err?.message ||
        "Failed to create villa order",
    });
  }
};




export const verifyVillaPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      startDate,
      endDate,
      guests,
      adults,
      children,
      vegGuests,
      nonVegGuests,
      customAmount,
      contactName,
      contactEmail,
      contactPhone,
      govIdType,
      govIdNumber,
      paymentMode,
      userId,
      addressInfo,
    } = req.body || {};

    if (!userId) {
      return res.status(400).json({
        message: "User is required for admin booking",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({
        message: "Invalid user. OTP verification required.",
      });
    }

    const totalGuests = Number(guests);

    const a = Number(adults || 0);
    const c = Number(children || 0);

    if (a + c !== totalGuests) {
      return res.status(400).json({
        message: "Adults + Children must equal total guests",
      });
    }

    if (a <= 0) {
      return res.status(400).json({
        message: "At least one adult is required",
      });
    }

    const veg = Number(vegGuests || 0);
    const nonVeg = Number(nonVegGuests || 0);

    if (veg + nonVeg !== totalGuests) {
      return res.status(400).json({
        message: "Veg + Non-Veg guests must equal total guests",
      });
    }

    if (
      totalGuests <= 0 ||
      veg < 0 ||
      nonVeg < 0 ||
      veg > totalGuests ||
      nonVeg > totalGuests
    ) {
      return res.status(400).json({
        message: "Invalid guest count values",
      });
    }

    if (addressInfo) {
      await User.findByIdAndUpdate(userId, {
        address: addressInfo.address || user.address,
        country: addressInfo.country || user.country,
        state: addressInfo.state || user.state,
        city: addressInfo.city || user.city,
        pincode: addressInfo.pincode || user.pincode,
      });
    }

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    if (isNaN(sDate) || isNaN(eDate)) {
      return res.status(400).json({ message: "Invalid booking dates" });
    }

    const nights = Math.max(
      1,
      Math.round((eDate - sDate) / (1000 * 60 * 60 * 24))
    );

    const amountINR = nights * Number(customAmount);

    if (paymentMode === "Cash") {
      const roomTotal = nights * Number(customAmount);

      const booking = await Booking.create({
        user: user._id,
        isVilla: true,

        startDate: sDate,
        endDate: eDate,
        nights,

        guests,
        adults,
        children,
        vegGuests,
        nonVegGuests,
        pricePerNight: Number(customAmount),
        roomTotal,
        amount: roomTotal,
        currency: "INR",

        status: "confirmed",
        paymentProvider: "offline",

        contactName,
        contactEmail,
        contactPhone,

        adminMeta: {
          fullName: contactName,
          phone: contactPhone,
          govIdType,
          govIdNumber,
          amountPaid: roomTotal,
          paymentMode: "Cash",
        },
      });

      if (req.body.enquiryId) {
        await Enquiry.findByIdAndUpdate(
          req.body.enquiryId,
          {
            status: "booked",
            bookingId: booking._id,
          }
        );
      }

      return res.json({ ok: true, booking });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: "Signature mismatch",
      });
    }

    const roomTotal = nights * Number(customAmount);

    const booking = await Booking.create({
      user: user._id,
      isVilla: true,

      startDate: sDate,
      endDate: eDate,
      nights,

      guests,
      adults,
      children,
      vegGuests,
      nonVegGuests,
      pricePerNight: Number(customAmount),
      roomTotal,
      amount: roomTotal,
      currency: "INR",

      status: "confirmed",
      paymentProvider: "razorpay",

      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,

      contactName,
      contactEmail,
      contactPhone,

      adminMeta: {
        fullName: contactName,
        phone: contactPhone,
        govIdType,
        govIdNumber,
        amountPaid: roomTotal,
        paymentMode: "Online",
      },
    });

    return res.json({ ok: true, booking });
  } catch (err) {
    console.error("verifyVillaPayment error:", err);
    return res.status(400).json({
      message: err?.message || "Villa payment verification failed",
    });
  }
};
