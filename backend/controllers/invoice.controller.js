import Booking from "../models/Booking.js";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import os from "os";
import { format } from "date-fns";


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
        adults: booking.adults,
        children: booking.children,
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
      return res
        .status(404)
        .set("Content-Type", "text/plain")
        .send("Booking not found");
    }

    // 🔐 USER OWNERSHIP CHECK (VERY IMPORTANT)
    if (!req.user?.isAdmin) {
      if (booking.user._id.toString() !== req.user.id) {
        return res
          .status(403)
          .set("Content-Type", "text/plain")
          .send("Unauthorized access to invoice");
      }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Invoice</title>

<style>
  * {
    box-sizing: border-box;
    padding: 0px;
  }



  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
      Roboto, Helvetica, Arial, sans-serif;
    background: #ffffff;
    padding: 0px;
    font-size: 13px;
    color: #111827;
  }

  .invoice {
    background: #ffffff;
    border-radius: 16px;
    padding: 15px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .logo {
    height: 45px;
  }

  .title {
    font-size: 16px;
    font-weight: 600;
  }

  .address-wrap {
    display: flex;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .address p {
    margin: 4px 0;
    font-size: 12px;
  }

  .address strong {
    font-size: 14px;
    font-weight: 600;
  }

  .invoice-no {
    text-align: right;
  }

  .invoice-no .label {
    font-size: 16px;
    color: #6b7280;
  }

  .invoice-no .value {
    font-size: 12px;
    font-weight: 600;
  }

  .card {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 24px;
  }

  .guest-info p {
    margin: 4px 0;
    font-size: 12px;
  }

  .guest-info strong {
    font-size: 14px;
    font-weight: 600;
  }

  .meta {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    background: #fbfaf9;
    border-radius: 8px;
    padding: 12px;
  }

  .meta-label {
    font-size: 12px;
    color: #6b7280;
  }

  .meta-value {
    font-size: 12px;
    font-weight: 500;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
  }

  thead {
    background: #fbfaf9;
  }

  th {
    text-align: left;
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 600;
  }

  td {
    padding: 12px 16px;
    font-size: 12px;
    border-top: 1px solid #e5e7eb;
  }

  .right {
    text-align: right;
  }

  .totals {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-bottom: 32px;
  }

  .payment-info p {
    margin: 4px 0;
    font-size: 12px;
  }

  .total-line {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    padding: 2px 0;
  }

  .grand {
    margin-top: 8px;
    font-size: 14px;
    font-weight: 600;
  }

  .signature {
    text-align: right;
    margin-bottom: 24px;
  }

  .signature p {
    margin: 2px 0;
  }

  .signature .name {
    font-weight: 600;
  }

  .footer {
    border-top: 1px solid #e5e7eb;
    padding-top: 12px;
    text-align: center;
    font-size: 11px;
    color: #6b7280;
  }
</style>
</head>

<body>
  <div class="invoice">

    <!-- HEADER -->
    <div class="header">
      <img src="https://gulposhadminsystem.netlify.app/pdfLogo.png" class="logo" />
      <div class="title">Invoice</div>
    </div>

    <!-- ADDRESS -->
    <div class="address-wrap">
      <div class="address">
        <p><strong>Villa Address:</strong></p>
        <p>Villa Gulposh Vidyasagar Properties Pvt Ltd.</p>
        <p>Kirawali, Karjat – 410201</p>
        <p>stay@villagulposh.com</p>
        <p>+91 98200 74617</p>
      </div>

      <div class="invoice-no">
        <div class="label">Invoice Number</div>
        <div class="value">
          INV-${booking._id.toString().slice(-6).toUpperCase()}
        </div>
      </div>
    </div>

    <!-- GUEST + META -->
    <div class="card">
      <div class="guest-info">
        <p><strong>Guest Info:</strong></p>
        <p>Name: ${booking.user?.name}</p>
        <p>Phone: ${booking.user?.phone}</p>
        <p>Email: ${booking.user?.email}</p>
      </div>

      <div class="meta">
        <div>
          <div class="meta-label">Check In</div>
          <div class="meta-value">${format(new Date(booking.startDate), "dd MMM yyyy")}</div>
        </div>
        <div>
          <div class="meta-label">Check Out</div>
          <div class="meta-value">${format(new Date(booking.endDate), "dd MMM yyyy")}</div>
        </div>
        <div>
          <div class="meta-label">Booking ID</div>
          <div class="meta-value">INV-${booking._id.toString().slice(-6).toUpperCase()}</div>
        </div>
        <div>
          <div class="meta-label">Nights</div>
          <div class="meta-value">${booking.nights}</div>
        </div>
        <div>
          <div class="meta-label">Rooms</div>
          <div class="meta-value">1</div>
        </div>
        <div>
          <div class="meta-label">Room Type</div>
          <div class="meta-value">${booking.room?.name}</div>
        </div>
      </div>
    </div>

    <!-- TABLE -->
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Rate</th>
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Room Charges</td>
          <td>₹${booking.pricePerNight} × ${booking.nights}</td>
          <td class="right">₹${booking.roomTotal}</td>
        </tr>
        ${booking.vegGuests > 0 ? `
        <tr>
          <td>Veg Meal</td>
          <td>₹${booking.room?.mealPriceVeg} × ${booking.vegGuests}</td>
          <td class="right">₹${booking.room?.mealPriceVeg * booking.vegGuests}</td>
        </tr>` : ``}
        ${booking.nonVegGuests > 0 ? `
        <tr>
          <td>Non-Veg Meal</td>
          <td>₹${booking.room?.mealPriceNonVeg} × ${booking.nonVegGuests}</td>
          <td class="right">₹${booking.room?.mealPriceNonVeg * booking.nonVegGuests}</td>
        </tr>` : ``}
      </tbody>
    </table>

    <!-- TOTALS -->
    <div class="totals">
      <div class="payment-info">
        <p><strong>Payment Info:</strong></p>
        <p>${booking.user?.name}</p>
        <p>${booking.paymentProvider} – ${booking.paymentId}</p>
        <p>Amount: ₹${booking.amount}</p>
      </div>

      <div>
        <div class="total-line">
          <span>SubTotal</span>
          <span>₹${booking.amount}</span>
        </div>
        <div class="total-line">
          <span>Tax 12%</span>
          <span>₹${Math.round(booking.amount * 0.12)}</span>
        </div>
        <div class="total-line grand">
          <span>Grand Total</span>
          <span>₹${Math.round(booking.amount * 1.12)}</span>
        </div>
      </div>
    </div>

    <!-- SIGNATURE -->
    <div class="signature">
      <p><em>Signature</em></p><br/>
      <p class="name">John Donate</p>
      <p style="font-size:12px;color:#6b7280">Accounts Manager</p>
    </div>

    <div class="footer">
      Terms And Condition: Your use of the website constitutes agreement
      to our Privacy Policy.
    </div>

  </div>
</body>
</html>
`;


    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      },
    });


    await browser.close();



    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Invoice-${booking._id.toString()}.pdf`
    );

    res.setHeader("Cache-Control", "no-store");

    return res.end(pdfBuffer);

  } catch (err) {
    console.error("Invoice PDF error:", err);
    res
      .status(500)
      .set("Content-Type", "text/plain")
      .send(err.message);
  }
};
