import Room from "../models/Room.js";

/* --------------------------------
   HELPERS
-------------------------------- */

const toArray = (v) => {
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") {
    return v
      .split(/[\n,]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeReviews = (v) => {
  if (!v) return [];

  // If already an array of objects
  if (Array.isArray(v)) {
    return v
      .filter(
        (r) =>
          r &&
          typeof r === "object" &&
          r.name &&
          r.rating !== undefined
      )
      .map((r) => ({
        name: String(r.name).trim(),
        rating: Math.min(5, Math.max(1, Number(r.rating))),
        comment: String(r.comment || "").trim(),
      }));
  }

  // If sent as JSON string
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return normalizeReviews(parsed);
    } catch {
      return [];
    }
  }

  return [];
};

/* --------------------------------
   CREATE ROOM
-------------------------------- */

export const createRoom = async (req, res) => {
  try {
    const {
      name,
      pricePerNight,
      mealPriceVeg,
      mealPriceNonVeg,
      mealPriceCombo,
      coverImage,
      galleryImages,
      description,
      amenities,
      houseRules, 
      reviews,
    } = req.body || {};

    if (!name || pricePerNight === undefined || pricePerNight === null) {
      return res
        .status(400)
        .json({ message: "name and pricePerNight are required" });
    }

    const room = await Room.create({
      name: String(name).trim(),
      pricePerNight: Number(pricePerNight) || 0,

      mealPriceVeg: Number(mealPriceVeg) || 0,
      mealPriceNonVeg: Number(mealPriceNonVeg) || 0,
      mealPriceCombo: Number(mealPriceCombo) || 0,

      coverImage: coverImage || "",
      galleryImages: toArray(galleryImages),
      description: description || "",
      amenities: toArray(amenities),
      houseRules: toArray(houseRules),
      reviews: normalizeReviews(reviews),
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* --------------------------------
   LIST ROOMS (ADMIN)
-------------------------------- */

export const listRoomsAdmin = async (_req, res) => {
  const rooms = await Room.find().sort({ createdAt: -1 });
  res.json(rooms);
};

/* --------------------------------
   GET ROOM (ADMIN)
-------------------------------- */

export const getRoomAdmin = async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ message: "Room not found" });
  res.json(room);
};

/* --------------------------------
   UPDATE ROOM
-------------------------------- */

export const updateRoom = async (req, res) => {
  try {
    const {
      name,
      pricePerNight,
      mealPriceVeg,
      mealPriceNonVeg,
      mealPriceCombo,
      coverImage,
      galleryImages,
      description,
      amenities,
      houseRules, 
      reviews, 
    } = req.body || {};

    const update = {};

    if (name !== undefined) update.name = String(name).trim();
    if (pricePerNight !== undefined)
      update.pricePerNight = Number(pricePerNight) || 0;

    if (mealPriceVeg !== undefined)
      update.mealPriceVeg = Number(mealPriceVeg) || 0;
    if (mealPriceNonVeg !== undefined)
      update.mealPriceNonVeg = Number(mealPriceNonVeg) || 0;
    if (mealPriceCombo !== undefined)
      update.mealPriceCombo = Number(mealPriceCombo) || 0;

    if (coverImage !== undefined) update.coverImage = coverImage || "";
    if (galleryImages !== undefined)
      update.galleryImages = toArray(galleryImages);
    if (description !== undefined) update.description = description || "";
    if (amenities !== undefined) update.amenities = toArray(amenities);

    // HOUSE RULES (ONLY UPDATE IF SENT)
    if (houseRules !== undefined) {
      update.houseRules = toArray(houseRules);
    }

    // REVIEWS (only if sent)
    if (reviews !== undefined) {
      update.reviews = normalizeReviews(reviews);
    }

    const room = await Room.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    if (!room) return res.status(404).json({ message: "Room not found" });

    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* --------------------------------
   DELETE ROOM
-------------------------------- */

export const deleteRoom = async (req, res) => {
  await Room.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
