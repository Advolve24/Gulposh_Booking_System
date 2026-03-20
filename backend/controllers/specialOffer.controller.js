import SpecialOffer from "../models/SpecialOffer.js";
import User from "../models/User.js";

const normalizePhone = (phone = "") => String(phone).replace(/\D/g, "").slice(-10);
const startOfDay = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (value) => {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const upsertSpecialOffer = async (req, res) => {
  try {
    const {
      userId,
      discountPercent,
      message,
      occasionType = "manual",
      occasionDate = null,
      validFrom = null,
      validTo = null,
    } = req.body || {};

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const parsedDiscount = Number(discountPercent);
    if (!Number.isFinite(parsedDiscount) || parsedDiscount <= 0 || parsedDiscount > 100) {
      return res.status(400).json({ message: "discountPercent must be between 1 and 100" });
    }

    if (!validFrom || !validTo) {
      return res.status(400).json({ message: "validFrom and validTo are required" });
    }

    const parsedValidFrom = startOfDay(validFrom);
    const parsedValidTo = endOfDay(validTo);
    if (parsedValidTo < parsedValidFrom) {
      return res.status(400).json({ message: "validTo must be after validFrom" });
    }

    const user = await User.findById(userId).select("name email phone anniversary dob");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await SpecialOffer.updateMany(
      { user: user._id, isActive: true },
      { $set: { isActive: false } }
    );

    const offer = await SpecialOffer.create({
      user: user._id,
      name: user.name || "",
      email: user.email || "",
      phone: normalizePhone(user.phone || ""),
      occasionType,
      occasionDate: occasionDate ? new Date(occasionDate) : null,
      validFrom: parsedValidFrom,
      validTo: parsedValidTo,
      discountPercent: parsedDiscount,
      message: String(message || "").trim(),
      isActive: true,
    });

    res.status(201).json(offer);
  } catch (err) {
    console.error("upsertSpecialOffer error:", err);
    res.status(500).json({ message: "Failed to save special offer" });
  }
};

export const getMySpecialOffer = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("email phone");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const normalizedPhone = normalizePhone(user.phone || "");
    const normalizedEmail = String(user.email || "").trim().toLowerCase();

    const offer = await SpecialOffer.findOne({
      isActive: true,
      $or: [
        { user: user._id },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    }).sort({ createdAt: -1 });

    if (!offer) {
      return res.json(null);
    }

    return res.json({
      _id: offer._id,
      user: offer.user,
      name: offer.name,
      email: offer.email,
      phone: offer.phone,
      occasionType: offer.occasionType,
      occasionDate: offer.occasionDate,
      validFrom: offer.validFrom,
      validTo: offer.validTo,
      discountPercent: offer.discountPercent,
      message: offer.message,
      isActive: offer.isActive,
      createdAt: offer.createdAt,
    });
  } catch (err) {
    console.error("getMySpecialOffer error:", err);
    res.status(500).json({ message: "Failed to load special offer" });
  }
};

export const getSpecialOfferByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const offer = await SpecialOffer.findOne({
      user: userId,
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!offer) {
      return res.json(null);
    }

    return res.json({
      _id: offer._id,
      user: offer.user,
      name: offer.name,
      email: offer.email,
      phone: offer.phone,
      occasionType: offer.occasionType,
      occasionDate: offer.occasionDate,
      validFrom: offer.validFrom,
      validTo: offer.validTo,
      discountPercent: offer.discountPercent,
      message: offer.message,
      isActive: offer.isActive,
      createdAt: offer.createdAt,
    });
  } catch (err) {
    console.error("getSpecialOfferByUser error:", err);
    res.status(500).json({ message: "Failed to load special offer" });
  }
};
