import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {

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
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
      default: undefined, 
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined, 
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

     passwordHash: {
      type: String,
      select: false,
    },

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

userSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $type: "string" },
    },
  }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string" },
    },
  }
);


userSchema.virtual("profileComplete").get(function () {
  return Boolean(this.name && this.dob);
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export default mongoose.model("User", userSchema);
