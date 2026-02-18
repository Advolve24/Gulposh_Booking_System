import Enquiry from "../models/Enquiry.js";

export const listEnquiriesAdmin = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const enquiries = await Enquiry.find(filter)
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    res.json(enquiries);
  } catch (err) {
    console.error("Admin fetch enquiries error:", err);
    res.status(500).json({ message: "Failed to fetch enquiries" });
  }
};
