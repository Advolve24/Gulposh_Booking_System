import mongoose from "mongoose";
import dotenv from "dotenv";
import TaxSetting from "../models/TaxSetting.js";

dotenv.config();

async function seedTax() {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    // ❌ Remove any existing tax config (keep only one)
    await TaxSetting.deleteMany({});

    // ✅ Insert single tax config
    await TaxSetting.create({
      taxPercent: 12, // 12% tax
    });

    console.log("✅ Tax seed inserted (12%)");
    process.exit(0);
  } catch (err) {
    console.error("❌ Tax seed failed:", err);
    process.exit(1);
  }
}

seedTax();