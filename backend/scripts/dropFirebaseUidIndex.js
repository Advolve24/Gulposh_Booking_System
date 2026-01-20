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

  const hasFirebaseIndex = indexes.some(
    (idx) => idx.name === "firebaseUid_1"
  );

  if (!hasFirebaseIndex) {
    console.log("ℹ️ Index firebaseUid_1 does not exist. Nothing to drop.");
  } else {
    await User.collection.dropIndex("firebaseUid_1");
    console.log("✅ Index firebaseUid_1 dropped successfully");
  }
} catch (err) {
  console.error("❌ Failed to drop index:", err.message);
} finally {
  await mongoose.disconnect();
  console.log("🔌 MongoDB disconnected");
  process.exit(0);
}
