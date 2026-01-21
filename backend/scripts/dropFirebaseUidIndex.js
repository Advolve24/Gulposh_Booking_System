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

const User = (await import("../models/User.js")).default;

try {
  const indexes = await User.collection.indexes();
  const indexNames = indexes.map((i) => i.name);

  /* ================= EMAIL INDEX ================= */

  if (indexNames.includes("email_1")) {
    await User.collection.dropIndex("email_1");
    console.log("✅ Index email_1 dropped successfully");
  } else {
    console.log("ℹ️ Index email_1 does not exist. Skipping.");
  }

  /* ================= MOBILE INDEX ================= */

  if (indexNames.includes("mobile_1")) {
    await User.collection.dropIndex("mobile_1");
    console.log("✅ Index mobile_1 dropped successfully");
  } else {
    console.log("ℹ️ Index mobile_1 does not exist. Skipping.");
  }

} catch (err) {
  console.error("❌ Failed to drop indexes:", err.message);
} finally {
  await mongoose.disconnect();
  console.log("🔌 MongoDB disconnected");
  process.exit(0);
}


