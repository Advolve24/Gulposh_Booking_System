import Booking from "../models/Booking.js";

export const getInvoice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("room", "name mealPriceVeg mealPriceNonVeg mealPriceCombo");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

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
        roomTotal: booking.roomTotal || booking.pricePerNight * booking.nights,

        withMeal: booking.withMeal,
        vegGuests: booking.vegGuests || 0,
        nonVegGuests: booking.nonVegGuests || 0,
        mealTotal: booking.mealTotal || 0,

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

