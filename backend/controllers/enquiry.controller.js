import Enquiry from "../models/Enquiry.js";
import { notifyAdmin } from "../utils/notifyAdmin.js";
import admin from "../config/firebaseAdmin.js";
import User from "../models/User.js";
import { setSessionCookie } from "../utils/session.js";
import jwt from "jsonwebtoken";
import Booking from "../models/Booking.js";


export const createEntireVillaEnquiry = async (req, res) => {
  try {
    const {
      name,
      email,
      startDate,
      endDate,
      guests,
      addressInfo,
      source,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!user.name && name) user.name = name;
    if (!user.email && email) user.email = email;
    if (!user.address && addressInfo?.address) user.address = addressInfo.address;
    if (!user.country && addressInfo?.country) user.country = addressInfo.country;
    if (!user.state && addressInfo?.state) user.state = addressInfo.state;
    if (!user.city && addressInfo?.city) user.city = addressInfo.city;
    if (!user.pincode && addressInfo?.pincode) user.pincode = addressInfo.pincode;

    user.profileComplete = true;
    await user.save();

    const enquiry = await Enquiry.create({
      type: "entire_villa_enquiry",
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      guests,
      addressInfo,
      source: source || "frontend",
      status: "enquiry",
    });

    await notifyAdmin("VILLA_ENQUIRY", {
      enquiryId: enquiry._id,
      name: user.name,
      phone: user.phone,
      guests,
      dates: `${startDate} → ${endDate}`,
    });

    res.status(201).json({
      message: "Enquiry submitted successfully",
      enquiry,
    });

  } catch (err) {
    console.error("Entire villa enquiry error:", err);
    res.status(500).json({ message: "Failed to submit enquiry" });
  }
};


export const getMyEnquiries = async (req, res) => {
  try {

    const enquiries = await Enquiry.find({ userId: req.user.id })
      .populate({
        path: "bookingId",
        select: "startDate endDate status amount createdAt",
      })
      .sort({ createdAt: -1 });

    for (const e of enquiries) {
      if (e.bookingId && e.status !== "booked") {
        e.status = "booked";
        await e.save();
      }
    }

    const response = enquiries.map((e) => ({
      _id: e._id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      guests: e.guests,
      startDate: e.startDate,
      endDate: e.endDate,
      status: e.status,
      isConverted: !!e.bookingId,
      booking: e.bookingId || null,

      createdAt: e.createdAt,
    }));

    res.json(response);

  } catch (err) {
    console.error("Fetch enquiries error:", err);
    res.status(500).json({ message: "Failed to load enquiries" });
  }
};