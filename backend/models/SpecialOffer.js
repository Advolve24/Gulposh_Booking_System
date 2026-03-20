import mongoose from "mongoose";

const specialOfferSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    occasionType: {
      type: String,
      enum: ["birthday", "anniversary", "manual"],
      default: "manual",
    },
    occasionDate: { type: Date, default: null },
    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    message: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

specialOfferSchema.index({ user: 1, isActive: 1 });

export default mongoose.model("SpecialOffer", specialOfferSchema);
