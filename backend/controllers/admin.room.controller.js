import Room from "../models/Room.js";

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


export const createRoom = async (req, res) => {
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
  } = req.body || {};

  if (!name || pricePerNight === undefined || pricePerNight === null) {
    return res.status(400).json({ message: "name and pricePerNight are required" });
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
  });

  res.status(201).json(room);
};



export const listRoomsAdmin = async (_req, res) => {
  const rooms = await Room.find().sort({ createdAt: -1 });
  res.json(rooms);
};


export const getRoomAdmin = async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ message: "Room not found" });
  res.json(room);
};


export const updateRoom = async (req, res) => {
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
  } = req.body || {};

  const update = {};

  if (name !== undefined) update.name = String(name).trim();
  if (pricePerNight !== undefined) update.pricePerNight = Number(pricePerNight) || 0;

  if (mealPriceVeg !== undefined) update.mealPriceVeg = Number(mealPriceVeg) || 0;
  if (mealPriceNonVeg !== undefined) update.mealPriceNonVeg = Number(mealPriceNonVeg) || 0;
  if (mealPriceCombo !== undefined) update.mealPriceCombo = Number(mealPriceCombo) || 0;

  if (coverImage !== undefined) update.coverImage = coverImage || "";
  if (galleryImages !== undefined) update.galleryImages = toArray(galleryImages);
  if (description !== undefined) update.description = description || "";

  if (amenities !== undefined) update.amenities = toArray(amenities); // NEW

  const room = await Room.findByIdAndUpdate(req.params.id, update, { new: true });

  if (!room) return res.status(404).json({ message: "Room not found" });

  res.json(room);
};


export const deleteRoom = async (req, res) => {
  await Room.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
