import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

if (!process.env.MONGO_URL) {
  console.error("❌ MONGO_URL not found in env");
  process.exit(1);
}

console.log("✅ MONGO_URL loaded");

await mongoose.connect(process.env.MONGO_URL);

console.log("✅ Connected to MongoDB");

const Booking = (await import("../models/Booking.js")).default;

const result = await Booking.updateMany(
  {
    withMeal: true,
    $or: [
      { mealMeta: { $exists: false } },
      { "mealMeta.vegPrice": { $exists: false } },
      { "mealMeta.nonVegPrice": { $exists: false } },
    ],
  },
  {
    $set: {
      "mealMeta.vegPrice": 500,
      "mealMeta.nonVegPrice": 1000,
    },
  }
);

console.log("✅ Meal meta fixed");
console.log("Matched:", result.matchedCount);
console.log("Modified:", result.modifiedCount);

await mongoose.disconnect();
process.exit(0);
