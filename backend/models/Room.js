import mongoose from "mongoose";

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

    pricePerNight: { type: Number, required: true, min: 0 },

    priceWithMeal: { type: Number, default: 0, min: 0 },

    coverImage: { type: String, default: "" },

    galleryImages: { type: [String], default: [] },

    mealMode: { type: String, enum: ["only", "price"], default: "" },
    mealPriceVeg: { type: Number, default: 0 },
    mealPriceNonVeg: { type: Number, default: 0 },

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

export default mongoose.model("Room", roomSchema);
