import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */

    name: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 50,
      default: null,
    },

    /* ================= PHONE (OTP LOGIN) ================= */

    phone: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
      default: undefined, // ✅ IMPORTANT: never null
    },

    /* ================= EMAIL (GOOGLE LOGIN) ================= */

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined, // ✅ IMPORTANT: never null
    },

    /* ================= PROFILE ================= */

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

    /* ================= AUTH META ================= */

    authProvider: {
      type: String,
      enum: ["phone", "google", "password"],
      required: true,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* =====================================================
   UNIQUE INDEXES (SAFE FOR BOTH LOGINS)
===================================================== */

// ✅ Phone must be unique ONLY when present
userSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $type: "string" },
    },
  }
);

// ✅ Email must be unique ONLY when present
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string" },
    },
  }
);

/* ================= PROFILE STATUS ================= */

userSchema.virtual("profileComplete").get(function () {
  return Boolean(this.name && this.dob);
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export default mongoose.model("User", userSchema);
