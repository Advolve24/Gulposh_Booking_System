import PDFDocument from "pdfkit";
import Booking from "../models/Booking.js";

export const getInvoice = async (req, res) => {
  try {
   const booking = await Booking.findById(req.params.id)
  .populate("user", "name email phone")
  .populate("room", "name"); ; 
    if (!booking) return res.status(404).send("Booking not found");

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${booking._id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text("Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Booking ID: ${booking._id}`);
    doc.text(`Name: ${booking.contactName || booking.user?.name}`);
    doc.text(`Email: ${booking.contactEmail || booking.user?.email}`);
    doc.text(`Phone: ${booking.contactPhone || booking.user?.phone}`);
    doc.moveDown();

    doc.text(`Room: ${booking.isVilla ? "Entire Villa" : booking.room?.name}`);
    doc.text(`Dates: ${booking.startDate.toDateString()} → ${booking.endDate.toDateString()}`);
    doc.text(`Nights: ${booking.nights}`);
    doc.text(`Guests: ${booking.guests}`);
    doc.moveDown();

    doc.text(`Price per night: ₹${booking.pricePerNight}`);
    doc.text(`Total Amount: ₹${booking.amount}`);
    doc.text(`Payment Provider: ${booking.paymentProvider}`);
    doc.text(`Order ID: ${booking.orderId}`);
    doc.text(`Payment ID: ${booking.paymentId}`);
    doc.text(`Status: ${booking.status}`);
    doc.moveDown();

    doc.text("Thank you for your booking!", { align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to generate invoice");
  }
};
