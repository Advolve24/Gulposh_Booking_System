import Enquiry from "../models/Enquiry.js";
import { notifyAdmin } from "../utils/notifyAdmin.js"; 
import admin from "../config/firebaseAdmin.js";
import User from "../models/User.js";
import { setSessionCookie } from "../utils/session.js";
import jwt from "jsonwebtoken";


export const createEntireVillaEnquiry = async (req, res) => {
  try {
    const {
      firebaseToken,
      name,
      email,
      phone,
      startDate,
      endDate,
      guests,
      addressInfo,
      source,
    } = req.body;

    if (!firebaseToken)
      return res.status(401).json({ message: "OTP verification required" });

    const decoded = await admin.auth().verifyIdToken(firebaseToken);
    const verifiedPhone = decoded.phone_number.replace(/\D/g, "").slice(-10);

    if (verifiedPhone !== phone)
      return res.status(401).json({ message: "Phone verification failed" });

    let user = await User.findOne({ phone: verifiedPhone });

    if (!user) {
      user = await User.create({
        name,
        email,
        phone: verifiedPhone,
        address: addressInfo?.address,
        country: addressInfo?.country,
        state: addressInfo?.state,
        city: addressInfo?.city,
        pincode: addressInfo?.pincode,
        authProvider: "phone",
        profileComplete: true,
      });

      await notifyAdmin("NEW_USER", {
        userId: user._id,
        phone: user.phone,
        source: "entire_villa_enquiry",
      });
    } else {
      if (!user.name) user.name = name;
      if (!user.email) user.email = email;
      if (!user.address) user.address = addressInfo?.address;
      if (!user.country) user.country = addressInfo?.country;
      if (!user.state) user.state = addressInfo?.state;
      if (!user.city) user.city = addressInfo?.city;
      if (!user.pincode) user.pincode = addressInfo?.pincode;

      user.profileComplete = true;
      await user.save();
    }

    const accessToken = jwt.sign(
      { id: user._id, isAdmin: !!user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "45m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "10d" }
    );

    setSessionCookie(res, "token", accessToken, { persistent: false });
    setSessionCookie(res, "refresh_token", refreshToken, {
      persistent: true,
      days: 10,
    });

    const enquiry = await Enquiry.create({
      type: "entire_villa_enquiry",
      userId: user._id,
      name,
      email,
      phone: verifiedPhone,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      guests,
      addressInfo,
      source: source || "frontend",
      status: "enquiry",
    });

    await notifyAdmin("VILLA_ENQUIRY", {
      enquiryId: enquiry._id,
      name,
      phone: verifiedPhone,
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
    const enquiries = await Enquiry.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(enquiries);
  } catch (err) {
    console.error("Fetch enquiries error:", err);
    res.status(500).json({ message: "Failed to load enquiries" });
  }
};