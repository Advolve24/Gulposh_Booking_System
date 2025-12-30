import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "Guest",
      minlength: 2,
      maxlength: 50,
    },

    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,          // 👈 IMPORTANT
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,          // 👈 IMPORTANT
    },

    passwordHash: {
      type: String,
      select: false,         // 👈 REQUIRED
    },

    dob: {
      type: Date,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
