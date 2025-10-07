import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    isVilla: { type: Boolean, default: false },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    guests: { type: Number, required: true, min: 1 },
    withMeal: { type: Boolean, default: false },

    contactName: String,
    contactEmail: String,
    contactPhone: String,

    currency: { type: String, default: "INR" },
    pricePerNight: { type: Number, required: true }, 
    nights: { type: Number, required: true },
    amount: { type: Number, required: true }, 

    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "confirmed" },

    paymentProvider: { type: String, default: "razorpay" },
    orderId: String,
    paymentId: String,
    signature: String,

    adminMeta: {
      fullName: String,
      phone: String,
      govIdType: {
        type: String,
        enum: ["Aadhaar", "Passport", "Voter ID", "Driving License"],
      },
      govIdNumber: String,
      amountPaid: Number,
      paymentMode: { type: String, enum: ["Cash", "UPI", "Card"], default: "Cash" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
