import Booking from "../models/Booking.js";
import puppeteer from "puppeteer";


export const getInvoice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("room", "name mealPriceVeg mealPriceNonVeg ");

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

export const downloadInvoicePDF = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("room", "name mealPriceVeg mealPriceNonVeg");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    /* ================= INVOICE HTML ================= */
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Inter, Arial, sans-serif; padding: 32px; }
            h1 { font-size: 22px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            td { padding: 8px 0; }
            .right { text-align: right; }
            .total { font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Invoice</h1>

          <p><strong>Invoice ID:</strong> INV-${booking._id
            .slice(-6)
            .toUpperCase()}</p>
          <p><strong>Guest:</strong> ${booking.user?.name}</p>
          <p><strong>Phone:</strong> ${booking.user?.phone || "-"}</p>

          <table>
            <tr>
              <td>Stay</td>
              <td class="right">
                ${booking.nights} nights × ₹${booking.pricePerNight}
              </td>
            </tr>

            ${
              booking.withMeal
                ? `
                <tr>
                  <td>Meals</td>
                  <td class="right">₹${booking.mealTotal}</td>
                </tr>
              `
                : ""
            }

            <tr>
              <td class="total">Total</td>
              <td class="right total">₹${booking.amount}</td>
            </tr>
          </table>

          <p style="margin-top:40px;font-size:12px;color:#555">
            Generated on ${new Date().toLocaleDateString()}
          </p>
        </body>
      </html>
    `;

    /* ================= PDF GENERATION ================= */
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    /* ================= 🔑 YOUR LINES GO HERE ================= */
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${booking._id
        .slice(-5)
        .toUpperCase()}.pdf`
    );

    res.send(pdfBuffer);
  } catch (err) {
    console.error("Invoice PDF error:", err);
    res.status(500).json({ message: "Invoice PDF generation failed" });
  }
};

