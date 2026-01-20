import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    /* =============================
       AUTH IDENTIFIERS
    ============================== */

    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    authProviders: {
      type: [String],
      enum: ["firebase", "google", "password"],
      default: [],
    },

    /* =============================
       CORE PROFILE
    ============================== */

    name: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 50,
      default: null,
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

    emailVerified: {
      type: Boolean,
      default: false,
    },

    dob: {
      type: Date,
      default: null,
    },

    address: { type: String, default: null },
    country: { type: String, default: null },
    state: { type: String, default: null },
    city: { type: String, default: null },

    pincode: {
      type: String,
      match: [/^\d{6}$/, "Pincode must be 6 digits"],
      default: null,
    },

    /* =============================
       PASSWORD (OPTIONAL FUTURE)
    ============================== */

    passwordHash: {
      type: String,
      select: false,
    },

    /* =============================
       ROLES
    ============================== */

    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* =============================
   VIRTUALS
============================== */

userSchema.virtual("profileComplete").get(function () {
  return Boolean(
    this.name &&
    this.dob &&
    this.phone &&                // 🔐 phone verified via Firebase
    this.emailVerified === true  // 🔐 email verified via Google
  );
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export default mongoose.model("User", userSchema);
