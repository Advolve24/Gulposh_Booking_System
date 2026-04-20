import mongoose from "mongoose";

const slugifyRoomName = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true },
  },
  { _id: false }
);



const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true, index: true },

    pricePerNight: { type: Number, required: true, min: 0 },

    weekendPricePerNight: { type: Number, default: 0, min: 0 },

    baseGuests: { type: Number, default: 1, min: 1 },

    priceWithMeal: { type: Number, default: 0, min: 0 },

    coverImage: { type: String, default: "" },

    galleryImages: { type: [String], default: [] },

    mealMode: { type: String, enum: ["only", "price"], default: "" },
    mealPriceVeg: { type: Number, default: 0 },
    mealPriceNonVeg: { type: Number, default: 0 },

    taxMode: {
      type: String,
      enum: ["included", "excluded"],
      default: "excluded",
    },

    discountType: {
      type: String,
      enum: ["none", "percent", "flat"],
      default: "none",
    },

    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountLabel: {
      type: String,
      default: "",
    },

    discountCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },

    description: { type: String, default: "" },

    amenities: { type: [String], default: [] },

    houseRules: { type: [String], default: [] },

    reviews: { type: [reviewSchema], default: [] },

    maxGuests: { type: Number, required: true, min: 1, default: 1 },

    isVilla: { type: Boolean, default: false },

    location: { type: String, default: "" },
  },
  { timestamps: true }
);

roomSchema.pre("validate", function enforceGuestCaps(next) {
  const safeBaseGuests = Math.max(1, Number(this.baseGuests || 1));
  const safeMaxGuests = Math.max(1, Number(this.maxGuests || 1));

  this.baseGuests = safeBaseGuests;
  this.maxGuests = safeMaxGuests;

  if (safeBaseGuests > safeMaxGuests) {
    this.invalidate(
      "baseGuests",
      "Base guests cannot be greater than max guests"
    );
  }

  next();
});

roomSchema.pre("validate", async function ensureSlug(next) {
  if (!this.isModified("name") && this.slug) {
    return next();
  }

  const baseSlug = slugifyRoomName(this.slug || this.name);
  if (!baseSlug) {
    return next();
  }

  let nextSlug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await mongoose.models.Room.findOne({
      slug: nextSlug,
      _id: { $ne: this._id },
    }).select("_id");

    if (!existing) {
      this.slug = nextSlug;
      return next();
    }

    nextSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
});

export default mongoose.model("Room", roomSchema);
