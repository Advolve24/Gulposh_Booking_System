import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    /* ================= BASIC ================= */
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    isVilla: { type: Boolean, default: false },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    nights: { type: Number, required: true },

    guests: { type: Number, required: true, min: 1 },

    /* ================= ROOM PRICING ================= */
    pricePerNight: { type: Number, required: true },
    roomTotal: { type: Number, required: true },

    /* ================= MEALS ================= */
    withMeal: { type: Boolean, default: false },

    vegGuests: { type: Number, default: 0 },
    nonVegGuests: { type: Number, default: 0 },

    // 🔥 IMPORTANT: LOCKED MEAL PRICES
    mealMeta: {
      vegPrice: { type: Number, default: 0 },
      nonVegPrice: { type: Number, default: 0 },
    },

    mealTotal: { type: Number, default: 0 },
    roomTotal: { type: Number, default: 0 },

    /* ================= FINAL ================= */
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    /* ================= CONTACT ================= */
    contactName: String,
    contactEmail: String,
    contactPhone: String,

    addressInfo: {
      address: String,
      country: String,
      state: String,
      city: String,
      pincode: String,
    },

    /* ================= STATUS ================= */
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "confirmed",
    },

    /* ================= PAYMENT ================= */
    paymentProvider: { type: String, default: "razorpay" },
    orderId: String,
    paymentId: String,
    signature: String,

    /* ================= ADMIN ================= */
    adminMeta: {
      fullName: String,
      phone: String,
      govIdType: {
        type: String,
        enum: ["Aadhaar", "Passport", "Voter ID", "Driving License"],
      },
      govIdNumber: String,
      amountPaid: Number,
      paymentMode: {
        type: String,
        enum: ["Cash", "UPI", "Card", "Online"],
        default: "Cash",
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
