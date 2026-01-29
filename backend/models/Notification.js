import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "BOOKING_CREATED",
        "BOOKING_CANCELLED",
        "VILLA_ENQUIRY",
        "NEW_USER",
        "SUPPORT_TICKET",
      ],
      required: true,
    },

    title: String,
    message: String,

    data: Object, // bookingId, enquiryId, etc.

    isRead: {
      type: Boolean,
      default: false,
    },

    audience: {
      type: String,
      default: "admin",
    },

     expiresAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
      index: { expires: 0 }, // MongoDB TTL
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ audience: 1, createdAt: -1 });
export default mongoose.model("Notification", NotificationSchema);
