import Razorpay from "razorpay";
import crypto from "crypto";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import TaxSetting from "../models/TaxSetting.js";
import {
  sendAdminBookingNotificationMail,
  sendBookingConfirmationMail,
} from "../utils/mailer.js";
import { parseYMD, toDateOnly } from "../lib/date.js";
import { notifyAdmin } from "../utils/notifyAdmin.js";
import User from "../models/User.js";
import SpecialOffer from "../models/SpecialOffer.js";
import {
  getRoomPricingBreakdown,
  getRoomPricingMeta,
} from "../utils/roomPricing.js";


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

const getRoomBasePerNight = (room, taxPercent, nightlyPrice = room?.pricePerNight) => {
  if (!room) return 0;
  if (room.taxMode === "included") {
    return Number(
      (Number(nightlyPrice || 0) / (1 + Number(taxPercent || 0) / 100)).toFixed(2)
    );
  }
  return Number(nightlyPrice || 0);
};

const analyzeWeekendStay = (start, end) => {
  if (!start || !end) return 0;

  const stayStart = toDateOnly(start);
  const stayEndExclusive = toDateOnly(end);
  let fridayNights = 0;
  let saturdayNights = 0;
  let sundayNights = 0;

  for (
    let cursor = new Date(stayStart);
    cursor < stayEndExclusive;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const day = cursor.getDay();
    if (day === 5) fridayNights += 1;
    if (day === 6) saturdayNights += 1;
    if (day === 0) sundayNights += 1;
  }

  const weekendNights = fridayNights + saturdayNights + sundayNights;

  return {
    fridayNights,
    saturdayNights,
    sundayNights,
    weekendNights,
  };
};

const getDiscountBreakup = ({
  subTotal,
  couponCode,
  room,
  guests,
  discountSettings,
  startDate,
  endDate,
  specialOffer,
}) => {
  const totalNights = nightsBetween(startDate, endDate);
  let couponDiscountAmount = 0;

  const validCoupon =
    couponCode &&
    room.discountCode &&
    couponCode.trim().toUpperCase() === room.discountCode.trim().toUpperCase();

  if (validCoupon) {
    if (room.discountType === "percent") {
      couponDiscountAmount = Math.round((subTotal * room.discountValue) / 100);
    } else if (room.discountType === "flat") {
      couponDiscountAmount = Number(room.discountValue || 0);
    }
  }

  const weekendDiscountEnabled = Boolean(discountSettings?.weekendDiscountEnabled);
  const twoWeekendNightsDiscountPercent = Number(
    discountSettings?.twoWeekendNightsDiscountPercent || 0
  );
  const threeWeekendNightsDiscountPercent = Number(
    discountSettings?.threeWeekendNightsDiscountPercent || 0
  );
  const weekendStay = analyzeWeekendStay(startDate, endDate);
  const weekendEligibleNights =
    weekendStay.weekendNights >= 2 ? weekendStay.weekendNights : 0;
  const weekendDiscountPercent =
    weekendStay.weekendNights >= 3
      ? threeWeekendNightsDiscountPercent
      : weekendStay.weekendNights >= 2
      ? twoWeekendNightsDiscountPercent
      : 0;
  const roomBasePerNight = getRoomBasePerNight(
    room,
    discountSettings?.taxPercent,
    Number(
      getRoomPricingBreakdown(room, startDate, endDate, guests)
        .weekendPricePerNight || room?.weekendPricePerNight || room?.pricePerNight || 0
    )
  );
  const weekendEligible =
    weekendDiscountEnabled &&
    weekendDiscountPercent > 0 &&
    weekendEligibleNights > 0;

  const postCouponSubtotal = Math.max(0, subTotal - couponDiscountAmount);
  const weekendEligibleSubtotal = Number(
    (roomBasePerNight * weekendEligibleNights).toFixed(2)
  );
  const weekendDiscountAmount = weekendEligible
    ? Math.round((weekendEligibleSubtotal * weekendDiscountPercent) / 100)
    : 0;

  const postWeekendSubtotal = Math.max(
    0,
    postCouponSubtotal - weekendDiscountAmount
  );
  const specialOfferPercent = Number(specialOffer?.discountPercent || 0);
  const eligibleOfferNights = getOfferEligibleNights(specialOffer, startDate, endDate);
  const eligibleOfferSubtotal =
    totalNights > 0
      ? Number(
          ((postWeekendSubtotal * eligibleOfferNights) / totalNights).toFixed(2)
        )
      : 0;
  const specialOfferAmount =
    specialOffer && specialOfferPercent > 0 && eligibleOfferNights > 0
      ? Math.round((eligibleOfferSubtotal * specialOfferPercent) / 100)
      : 0;

  const discountAmount =
    couponDiscountAmount + weekendDiscountAmount + specialOfferAmount;

  return {
    discountAmount,
    couponDiscountAmount,
    weekendDiscountAmount,
    weekendDiscountEnabled,
    weekendDiscountPercent: weekendEligible ? weekendDiscountPercent : 0,
    weekendDiscountEligibleNights: weekendEligibleNights,
    weekendEligible,
    specialOfferId: specialOffer?._id || null,
    specialOfferPercent,
    specialOfferAmount,
    specialOfferEligibleNights: eligibleOfferNights,
    specialOfferMessage: specialOffer?.message || "",
  };
};

const doesOfferOverlapStay = (offer, startDate, endDate) => {
  if (!offer || !startDate || !endDate) return false;

  const stayStart = toDateOnly(startDate);
  const stayEndExclusive = toDateOnly(endDate);
  const offerStart = toDateOnly(offer.validFrom);
  const offerEndExclusive = toDateOnly(offer.validTo);

  return stayStart < offerEndExclusive && stayEndExclusive > offerStart;
};

const getOfferEligibleNights = (offer, startDate, endDate) => {
  if (!offer || !startDate || !endDate) return 0;

  const stayStart = toDateOnly(startDate);
  const stayEndExclusive = toDateOnly(endDate);
  const offerStart = toDateOnly(offer.validFrom);
  const offerEndExclusive = toDateOnly(offer.validTo);

  const overlapStart = stayStart > offerStart ? stayStart : offerStart;
  const overlapEndExclusive =
    stayEndExclusive < offerEndExclusive ? stayEndExclusive : offerEndExclusive;

  return Math.max(
    0,
    Math.round((overlapEndExclusive - overlapStart) / 86400000)
  );
};

const getEligibleSpecialOffer = async (user, startDate, endDate) => {
  if (!user || !startDate || !endDate) return null;

  const normalizedEmail = String(user.email || "").trim().toLowerCase();
  const normalizedPhone = String(user.phone || "").replace(/\D/g, "").slice(-10);

  const offer = await SpecialOffer.findOne({
    isActive: true,
    $or: [
      { user: user._id },
      ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
    ],
  }).sort({ createdAt: -1 });

  return doesOfferOverlapStay(offer, startDate, endDate) ? offer : null;
};

const hasApplicableCouponDiscount = (room, couponCode) =>
  Boolean(
    couponCode &&
      room?.discountCode &&
      couponCode.trim().toUpperCase() === room.discountCode.trim().toUpperCase()
  );

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

    const taxSetting = await TaxSetting.findOne();
    if (!taxSetting) {
      return res.status(500).json({ message: "Tax configuration missing" });
    }

    const currentUser = await User.findById(userId).select("email phone");
    const specialOffer = await getEligibleSpecialOffer(currentUser, sDate, eDate);
    const weekendStay = analyzeWeekendStay(sDate, eDate);
    const weekendDiscountPercent =
      weekendStay.weekendNights >= 3
        ? Number(taxSetting.threeWeekendNightsDiscountPercent || 0)
        : weekendStay.weekendNights >= 2
        ? Number(taxSetting.twoWeekendNightsDiscountPercent || 0)
        : 0;
    const hasWeekendDiscount = Boolean(
      taxSetting.weekendDiscountEnabled &&
        weekendDiscountPercent > 0 &&
        weekendStay.weekendNights >= 2
    );
    const hasCouponDiscount = hasApplicableCouponDiscount(room, couponCode);
    const hasSpecialOfferDiscount = Boolean(
      specialOffer?.discountPercent &&
        getOfferEligibleNights(specialOffer, sDate, eDate) > 0
    );

    const pricingBreakdown = getRoomPricingBreakdown(
      room,
      sDate,
      eDate,
      Number(guests)
    );
    const roomGrossTotal = Number(pricingBreakdown.roomTotal || 0);
    const preciseRoomTotal =
      room.taxMode === "included"
        ? Number(
            (
              roomGrossTotal /
              (1 + Number(taxSetting.taxPercent || 0) / 100)
            ).toFixed(2)
          )
        : roomGrossTotal;
    const roomTotal =
      room.taxMode === "included" &&
      (hasWeekendDiscount || hasCouponDiscount || hasSpecialOfferDiscount)
        ? Math.round(preciseRoomTotal)
        : preciseRoomTotal;

    const mealTotal = withMeal
      ? nights *
      (vegGuests * room.mealPriceVeg +
        nonVegGuests * room.mealPriceNonVeg)
      : 0;

    const subTotal = roomTotal + mealTotal;

    const refreshedDiscountBreakup = getDiscountBreakup({
      subTotal,
      couponCode,
      room,
      guests: Number(guests),
      discountSettings: taxSetting,
      startDate: sDate,
      endDate: eDate,
      specialOffer,
    });
    const discountAmount = refreshedDiscountBreakup.discountAmount;
    const finalDiscountedSubtotal = Math.max(0, subTotal - discountAmount);

    const cgstPercent = taxSetting.taxPercent / 2;
    const sgstPercent = taxSetting.taxPercent / 2;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let totalTax = 0;

    cgstAmount = Number(
      ((finalDiscountedSubtotal * cgstPercent) / 100).toFixed(2)
    );

    sgstAmount = Number(
      ((finalDiscountedSubtotal * sgstPercent) / 100).toFixed(2)
    );

    totalTax = Number((cgstAmount + sgstAmount).toFixed(2));

    const grandTotal = Math.round(finalDiscountedSubtotal + totalTax);

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
      discountedSubtotal: finalDiscountedSubtotal,
      weekendDiscountEnabled: refreshedDiscountBreakup.weekendEligible,
      weekendDiscountPercent: refreshedDiscountBreakup.weekendDiscountPercent,
      weekendDiscountAmount: refreshedDiscountBreakup.weekendDiscountAmount,
      weekendDiscountEligibleNights:
        refreshedDiscountBreakup.weekendDiscountEligibleNights,
      couponDiscountAmount: refreshedDiscountBreakup.couponDiscountAmount,
      specialOfferId: refreshedDiscountBreakup.specialOfferId,
      specialOfferPercent: refreshedDiscountBreakup.specialOfferPercent,
      specialOfferAmount: refreshedDiscountBreakup.specialOfferAmount,
      specialOfferEligibleNights: refreshedDiscountBreakup.specialOfferEligibleNights,
      specialOfferMessage: refreshedDiscountBreakup.specialOfferMessage,
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

    const taxSetting = await TaxSetting.findOne();
    if (!taxSetting) {
      return res.status(500).json({ message: "Tax configuration missing" });
    }

    const specialOffer = await getEligibleSpecialOffer(user, sDate, eDate);
    const weekendStay = analyzeWeekendStay(sDate, eDate);
    const weekendDiscountPercent =
      weekendStay.weekendNights >= 3
        ? Number(taxSetting.threeWeekendNightsDiscountPercent || 0)
        : weekendStay.weekendNights >= 2
        ? Number(taxSetting.twoWeekendNightsDiscountPercent || 0)
        : 0;
    const hasWeekendDiscount = Boolean(
      taxSetting.weekendDiscountEnabled &&
        weekendDiscountPercent > 0 &&
        weekendStay.weekendNights >= 2
    );
    const hasCouponDiscount = hasApplicableCouponDiscount(room, couponCode);
    const hasSpecialOfferDiscount = Boolean(
      specialOffer?.discountPercent &&
        getOfferEligibleNights(specialOffer, sDate, eDate) > 0
    );

    const pricingBreakdown = getRoomPricingBreakdown(
      room,
      sDate,
      eDate,
      Number(guests)
    );
    const roomGrossTotal = Number(pricingBreakdown.roomTotal || 0);
    const preciseRoomTotal =
      room.taxMode === "included"
        ? Number(
            (
              roomGrossTotal /
              (1 + Number(taxSetting.taxPercent || 0) / 100)
            ).toFixed(2)
          )
        : roomGrossTotal;
    const roomTotal =
      room.taxMode === "included" &&
      (hasWeekendDiscount || hasCouponDiscount || hasSpecialOfferDiscount)
        ? Math.round(preciseRoomTotal)
        : preciseRoomTotal;
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

    const discountBreakup = getDiscountBreakup({
      subTotal,
      couponCode,
      room,
      guests: Number(guests),
      discountSettings: taxSetting,
      startDate: sDate,
      endDate: eDate,
      specialOffer,
    });
    const discountAmount = discountBreakup.discountAmount;
    const discountedSubtotal = Math.max(0, subTotal - discountAmount);

    const cgstPercent = taxSetting.taxPercent / 2;
    const sgstPercent = taxSetting.taxPercent / 2;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let totalTax = 0;
    const taxableAmount = discountedSubtotal;

    cgstAmount = Number(
      ((taxableAmount * cgstPercent) / 100).toFixed(2)
    );

    sgstAmount = Number(
      ((taxableAmount * sgstPercent) / 100).toFixed(2)
    );

    totalTax = Number((cgstAmount + sgstAmount).toFixed(2));

    const grandTotal = Math.round(discountedSubtotal + totalTax);

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
      pricePerNight:
        nights > 0 ? Number((roomTotal / nights).toFixed(2)) : 0,
      roomTotal,
      pricingMeta: getRoomPricingMeta(room, sDate, eDate, Number(guests)),
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
              couponDiscountType: room.discountType,
              couponDiscountValue: room.discountValue,
              couponDiscountAmount: discountBreakup.couponDiscountAmount,
              weekendDiscountEnabled: discountBreakup.weekendEligible,
              weekendDiscountPercent: discountBreakup.weekendDiscountPercent,
              weekendDiscountAmount: discountBreakup.weekendDiscountAmount,
              weekendDiscountEligibleNights:
                discountBreakup.weekendDiscountEligibleNights,
              specialOfferId: discountBreakup.specialOfferId,
              specialOfferPercent: discountBreakup.specialOfferPercent,
              specialOfferAmount: discountBreakup.specialOfferAmount,
              specialOfferEligibleNights: discountBreakup.specialOfferEligibleNights,
              specialOfferMessage: discountBreakup.specialOfferMessage,
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

    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    if (adminEmail) {
      try {
        await sendAdminBookingNotificationMail({
          to: adminEmail,
          booking,
          room,
          customerName: contactName || user?.name || "Guest",
        });
        console.log("Admin booking mail sent:", adminEmail);
      } catch (err) {
        console.error("Admin booking mail error:", err.message);
      }
    } else {
      console.warn("ADMIN_EMAIL not configured; admin booking mail skipped");
    }

    return res.json({ ok: true, booking });
  } catch (err) {
    console.error("❌ verifyPayment error:", err);
    return res
      .status(500)
      .json({ message: "Payment verification failed" });
  }
};
