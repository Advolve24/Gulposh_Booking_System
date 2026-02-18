import Enquiry from "../models/Enquiry.js";
import { notifyAdmin } from "../utils/notifyAdmin.js";
import admin from "../config/firebaseAdmin.js";
import User from "../models/User.js";
import { setSessionCookie } from "../utils/session.js";
import jwt from "jsonwebtoken";


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
      .sort({ createdAt: -1 })
      .lean();

    res.json(enquiries);
  } catch (err) {
    console.error("Fetch enquiries error:", err);
    res.status(500).json({ message: "Failed to load enquiries" });
  }
};