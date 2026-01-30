import Enquiry from "../models/Enquiry.js";
import { notifyAdmin } from "../utils/notifyAdmin.js"; // ✅ NEW

export const createEntireVillaEnquiry = async (req, res) => {
  try {
    const {
      type,
      name,
      email,
      phone,
      startDate,
      endDate,
      guests,
      addressInfo,
      source,
    } = req.body;

    if (!startDate || !endDate || !guests) {
      return res.status(400).json({
        message: "Missing required enquiry details",
      });
    }

    const enquiry = await Enquiry.create({
      type: type || "entire_villa_enquiry",

      userId: req.user.id, // 🔥 from authRequired

      name,
      email,
      phone,

      startDate: new Date(startDate),
      endDate: new Date(endDate),
      guests,

      addressInfo,

      source: source || "frontend",
      status: "enquiry",
    });

     /* 🔔 NOTIFY ADMIN — VILLA ENQUIRY */
    await notifyAdmin("VILLA_ENQUIRY", {
      enquiryId: enquiry._id,
      name,
      email,
      phone,
      guests,
      dates: `${startDate} → ${endDate}`,
      source: enquiry.source,
    });

    res.status(201).json({
      message: "Enquiry submitted successfully",
      enquiry,
    });
  } catch (err) {
    console.error("Entire villa enquiry error:", err);
    res.status(500).json({
      message: "Failed to submit enquiry",
    });
  }
};
