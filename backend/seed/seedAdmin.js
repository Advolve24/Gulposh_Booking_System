import "dotenv/config.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const rawEmail = process.env.ADMIN_EMAIL || "";
const email = rawEmail.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
  process.exit(1);
}

const mongo = process.env.MONGO_URL || process.env.MONGO_URI;
if (!mongo) {
  console.error("Set MONGO_URL (or MONGO_URI) in .env");
  process.exit(1);
}

await mongoose.connect(mongo);

const passwordHash = await bcrypt.hash(password, 10);
await User.updateOne(
  { email },
  { $set: { name: "Admin", email, passwordHash, isAdmin: true } },
  { upsert: true }
);

console.log("Admin seeded:", email);
await mongoose.disconnect();
