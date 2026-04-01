// models/TaxSetting.js
import mongoose from "mongoose";

const taxSettingSchema = new mongoose.Schema(
  {
    taxPercent: {
      type: Number,
      required: true, // e.g. 8 (%)
      min: 0,
      max: 100,
    },
    weekendDiscountEnabled: {
      type: Boolean,
      default: false,
    },
    twoWeekendNightsDiscountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    threeWeekendNightsDiscountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

export default mongoose.model("TaxSetting", taxSettingSchema);
