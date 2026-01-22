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
  },
  { timestamps: true }
);

export default mongoose.model("Notification", NotificationSchema);
