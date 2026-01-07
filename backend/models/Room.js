import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true },
  },
  { _id: false } // keeps it lightweight
);



const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    pricePerNight: { type: Number, required: true, min: 0 },

    priceWithMeal: { type: Number, default: 0, min: 0 },

    coverImage: { type: String, default: "" },

    galleryImages: { type: [String], default: [] },

    mealPriceVeg: { type: Number, default: 0 },

    mealPriceNonVeg: { type: Number, default: 0 },

    // mealPriceCombo: { type: Number, default: 0 },

    description: { type: String, default: "" },

    amenities: { type: [String], default: [] },

    houseRules: { type: [String], default: [] },

    reviews: { type: [reviewSchema], default: [] },

    isVilla: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
