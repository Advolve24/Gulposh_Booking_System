import mongoose from "mongoose";

const TaxConfigSchema = new mongoose.Schema(
  {
    stayTaxPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },

    foodTaxPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  { _id: false }
);

const TaxSettingSchema = new mongoose.Schema(
  {
    withoutFood: {
      stayTaxPercent: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0,
      },
    },

    withFood: {
      stayTaxPercent: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0,
      },

      foodTaxPercent: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ✅ ENSURE ONLY ONE TAX CONFIG EXISTS */
TaxSettingSchema.index({ isActive: 1 });

export default mongoose.model("TaxSetting", TaxSettingSchema);