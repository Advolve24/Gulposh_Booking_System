import mongoose from "mongoose";
import dotenv from "dotenv";
import TaxSetting from "../models/TaxSetting.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URL);

await TaxSetting.updateMany(
  { isActive: true },
  { $set: { isActive: false } }
);

await TaxSetting.create({
  withoutFood: {
    stayTaxPercent: 12,
  },
  withFood: {
    stayTaxPercent: 12,
    foodTaxPercent: 5,
  },
  isActive: true,
});

console.log("✅ Tax seed inserted");
process.exit();