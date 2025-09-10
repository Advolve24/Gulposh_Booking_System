import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    pricePerNight: { type: Number, required: true, min: 0 },

    priceWithMeal: { type: Number, default: 0, min: 0 },

    coverImage: { type: String, default: "" },

    galleryImages: { type: [String], default: [] },

    description: { type: String, default: "" },

    roomServices: { type: [String], default: [] },

    accommodation: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
