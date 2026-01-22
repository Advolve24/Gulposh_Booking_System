import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: "entire_villa_enquiry",
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: String,
    email: String,
    phone: String,

    startDate: Date,
    endDate: Date,
    guests: Number,

    addressInfo: {
      address: String,
      country: String,
      state: String,
      city: String,
      pincode: String,
    },

    source: {
      type: String,
      default: "Client",
    },

    status: {
      type: String,
      default: "enquiry", // enquiry | contacted | converted | closed
    },
  },
  { timestamps: true }
);

export default mongoose.model("Enquiry", enquirySchema);
