import Booking from "../models/Booking.js";

export const getInvoice = async (req, res) => {
  try {
    // Fetch the booking with user and room info
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("room", "name");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Send clean JSON response (frontend will use this)
    res.json({
      success: true,
      data: {
        _id: booking._id,
        user: booking.user,
        room: booking.room,
        isVilla: booking.isVilla,
        nights: booking.nights,
        guests: booking.guests,
        startDate: booking.startDate,
        endDate: booking.endDate,
        pricePerNight: booking.pricePerNight,
        amount: booking.amount,
        paymentProvider: booking.paymentProvider,
        orderId: booking.orderId,
        paymentId: booking.paymentId,
        status: booking.status,
        createdAt: booking.createdAt,
      },
    });
  } catch (err) {
    console.error("Invoice fetch error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice details",
      error: err.message,
    });
  }
};
