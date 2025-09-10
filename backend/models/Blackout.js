import mongoose from "mongoose";

const BlackoutSchema = new mongoose.Schema(
  {
    from: { type: Date, required: true },
    to:   { type: Date, required: true },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

BlackoutSchema.index({ from: 1, to: 1 });

export default mongoose.model("Blackout", BlackoutSchema);
