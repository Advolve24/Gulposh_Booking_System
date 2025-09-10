import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  passwordHash: { type: String, required: true },
  isAdmin: { type: Boolean, default: false } 
}, { timestamps: true });

export default mongoose.model("User", userSchema);
