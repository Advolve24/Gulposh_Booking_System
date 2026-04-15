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
      weekendPricePerNight,
      baseGuests,
      maxGuests,
      mealMode,
      taxMode,
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

    const safeBaseGuests =
      baseGuests !== undefined ? Math.max(1, Number(baseGuests)) : 1;
    const safeMaxGuests =
      maxGuests !== undefined ? Math.max(1, Number(maxGuests)) : 1;

    if (safeBaseGuests > safeMaxGuests) {
      return res.status(400).json({
        message: "baseGuests cannot be greater than maxGuests",
      });
    }

    const room = await Room.create({
      name: String(name).trim(),
      pricePerNight: Number(pricePerNight) || 0,
      weekendPricePerNight:
        weekendPricePerNight !== undefined
          ? Number(weekendPricePerNight) || 0
          : Number(pricePerNight) || 0,
      baseGuests: safeBaseGuests,
      maxGuests: safeMaxGuests,

      mealMode: mealMode || "",

      taxMode: taxMode || "excluded",

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
      weekendPricePerNight,
      baseGuests,
      maxGuests,
      mealMode,
      taxMode,
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

    if (weekendPricePerNight !== undefined) {
      update.weekendPricePerNight = Number(weekendPricePerNight) || 0;
    } else if (pricePerNight !== undefined) {
      update.weekendPricePerNight = Number(pricePerNight) || 0;
    }

    const currentRoom = await Room.findById(req.params.id).select(
      "baseGuests maxGuests"
    );

    if (!currentRoom) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (baseGuests !== undefined) {
      update.baseGuests = Math.max(1, Number(baseGuests));
    }

    if (maxGuests !== undefined) {
      update.maxGuests = Math.max(1, Number(maxGuests));
    }

    const finalBaseGuests = Number(
      update.baseGuests ?? currentRoom.baseGuests ?? 1
    );
    const finalMaxGuests = Number(
      update.maxGuests ?? currentRoom.maxGuests ?? 1
    );

    if (finalBaseGuests > finalMaxGuests) {
      return res.status(400).json({
        message: "baseGuests cannot be greater than maxGuests",
      });
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

    if (taxMode !== undefined) {
      update.taxMode = taxMode || "excluded";
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

    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const deleteRoom = async (req, res) => {
  await Room.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
