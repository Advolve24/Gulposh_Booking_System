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

const normalizeReviews = (v) => {
  if (!v) return [];

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


export const createRoom = async (req, res) => {
  try {
    const {
      name,
      pricePerNight,
      maxGuests,
      mealMode,
      mealPriceVeg,
      mealPriceNonVeg,
      coverImage,
      galleryImages,
      description,
      amenities,
      houseRules,
      reviews,
      discountType,
      discountValue,
      discountLabel,
      discountCode,
    } = req.body || {};

    if (!name || pricePerNight === undefined || pricePerNight === null) {
      return res.status(400).json({
        message: "name and pricePerNight are required",
      });
    }

    const room = await Room.create({
      name: String(name).trim(),
      pricePerNight: Number(pricePerNight) || 0,

      maxGuests:
        maxGuests !== undefined
          ? Math.max(1, Number(maxGuests))
          : 1,

      mealMode: mealMode || "",

      mealPriceVeg:
        mealMode === "price" ? Number(mealPriceVeg) || 0 : 0,

      mealPriceNonVeg:
        mealMode === "price" ? Number(mealPriceNonVeg) || 0 : 0,

      discountType: discountType || "none",
      discountValue:
        discountType !== "none"
          ? Number(discountValue) || 0
          : 0,
      discountLabel: discountLabel || "",
      discountCode: discountCode || "",

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



export const listRoomsAdmin = async (_req, res) => {
  const rooms = await Room.find().sort({ createdAt: -1 });
  res.json(rooms);
};



export const getRoomAdmin = async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }
  res.json(room);
};



export const updateRoom = async (req, res) => {
  try {
    const {
      name,
      pricePerNight,
      maxGuests,
      mealMode,
      mealPriceVeg,
      mealPriceNonVeg,
      coverImage,
      galleryImages,
      description,
      amenities,
      houseRules,
      reviews,
      discountType,
      discountValue,
      discountLabel,
      discountCode,
    } = req.body || {};

    const update = {};

    if (name !== undefined) update.name = String(name).trim();

    if (pricePerNight !== undefined) {
      update.pricePerNight = Number(pricePerNight) || 0;
    }

    if (maxGuests !== undefined) {
      update.maxGuests = Math.max(1, Number(maxGuests));
    }

    if (mealPriceVeg !== undefined) {
      update.mealPriceVeg = Number(mealPriceVeg) || 0;
    }

    if (mealPriceNonVeg !== undefined) {
      update.mealPriceNonVeg = Number(mealPriceNonVeg) || 0;
    }

    if (mealMode !== undefined) {
      update.mealMode = mealMode || "";
    }

    if (mealMode === "price") {
      update.mealPriceVeg = Number(mealPriceVeg) || 0;
      update.mealPriceNonVeg = Number(mealPriceNonVeg) || 0;
    } else {
      update.mealPriceVeg = 0;
      update.mealPriceNonVeg = 0;
    }

    if (discountType !== undefined) {
      update.discountType = discountType || "none";

      if (discountType === "none") {
        update.discountValue = 0;
      } else if (discountValue !== undefined) {
        update.discountValue = Number(discountValue) || 0;
      }
    }

    if (discountLabel !== undefined) {
      update.discountLabel = discountLabel || "";
    }

    if (discountCode !== undefined) {
      update.discountCode = discountCode || "";
    }

    if (coverImage !== undefined) {
      update.coverImage = coverImage || "";
    }

    if (galleryImages !== undefined) {
      update.galleryImages = toArray(galleryImages);
    }

    if (description !== undefined) {
      update.description = description || "";
    }

    if (amenities !== undefined) {
      update.amenities = toArray(amenities);
    }

    if (houseRules !== undefined) {
      update.houseRules = toArray(houseRules);
    }

    if (reviews !== undefined) {
      update.reviews = normalizeReviews(reviews);
    }

    const room = await Room.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const deleteRoom = async (req, res) => {
  await Room.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
