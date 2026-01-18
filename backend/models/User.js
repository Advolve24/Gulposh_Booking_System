import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */
    name: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 50,
      default: null, // 🔑 important: OTP users start empty
    },

    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      default: null,
    },

    dob: {
      type: Date,
      default: null,
    },

    /* ================= ADDRESS INFO ================= */
    address: {
      type: String,
      trim: true,
      default: null,
    },

    country: {
      type: String,
      trim: true,
      default: null,
    },

    state: {
      type: String,
      trim: true,
      default: null,
    },

    city: {
      type: String,
      trim: true,
      default: null,
    },

    pincode: {
      type: String,
      trim: true,
      match: [/^\d{6}$/, "Pincode must be 6 digits"],
      default: null,
    },

     /* ================= AUTH PROVIDERS ================= */

    // Firebase Phone Auth UID
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Google OAuth unique ID (payload.sub)
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Which provider user used initially
    authProvider: {
      type: String,
      enum: ["firebase", "google"],
      required: true,
    },


    /* ================= AUTH ================= */
    passwordHash: {
      type: String,
      select: false,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* ================= VIRTUAL: PROFILE COMPLETE ================= */
userSchema.virtual("profileComplete").get(function () {
  return Boolean(this.name && this.dob);
});

/* Ensure virtuals are included */
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export default mongoose.model("User", userSchema);
