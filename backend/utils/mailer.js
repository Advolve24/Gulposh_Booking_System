import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendBookingConfirmationMail({ to, name, room, booking }) {
  if (!to) {
    console.warn("No recipient email for booking confirmation");
    return;
  }

  const {
    startDate,
    endDate,
    guests,
    withMeal,
    nights,
    amount,
    paymentId,
    orderId,
    addressInfo,
  } = booking;

  const checkIn = new Date(startDate);
  const checkOut = new Date(endDate);

  const fmtDate = (d) =>
    d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const amountFormatted = `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const addressBlock = addressInfo
    ? [
        addressInfo.address,
        addressInfo.city,
        addressInfo.state,
        addressInfo.country,
        addressInfo.pincode,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Booking Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f6fb;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f6fb;padding:24px 0;">
    <tr>
      <td align="center">
        <!-- Outer card -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 18px rgba(15,23,42,0.12);">
          
          <!-- Header bar -->
          <tr>
            <td style="padding:20px 24px;background:linear-gradient(90deg,#004aad,#007bff);color:#ffffff;">
              <table width="100%" cellspacing="0" cellpadding="0" role="presentation">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="display:flex;align-items:center;justify-content:center;">
                      <div style="width:40px;height:40px;border-radius:50%;background-color:#fff;display:flex;align-items:center;justify-content:center;margin-right:12px;"> 
                      <img src="https://gulposhbookingsystem.netlify.app/logo1.png"  width="24" height="24" style="display:block;">
                      </div>
                      <div>
                        <div style="font-size:20px;font-weight:bold;margin-bottom:2px;">Booking Confirmed</div>
                        <div style="font-size:12px;opacity:0.9;">${room?.name || "Luxurious Villa"}</div>
                      </div>
                      </div>
                    </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="padding:24px;">
              <!-- Greeting -->
              <p style="margin:0 0 12px 0;font-size:14px;color:#111827;">
                Hi <strong>${name || "Guest"}</strong>,
              </p>
              <p style="margin:0 0 18px 0;font-size:14px;color:#111827;line-height:1.5;">
                Thank you for your booking. Your reservation is <strong>confirmed</strong>.
              </p>

              <!-- Booking Details title -->
              <h3 style="margin:0 0 8px 0;font-size:16px;color:#111827;border-left:3px solid #f5b400;padding-left:8px;">
                Booking Details
              </h3>

              <!-- Booking details card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#e6f3ff;border-radius:8px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#111827;">
                <tr>
                  <td style="padding:4px 0;width:40%;color:#4b5563;">Property:</td>
                  <td style="padding:4px 0;text-align:right;font-weight:600;">${room?.name || "Villa"}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#4b5563;">Check-in:</td>
                  <td style="padding:4px 0;text-align:right;">${fmtDate(checkIn)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#4b5563;">Check-out:</td>
                  <td style="padding:4px 0;text-align:right;">${fmtDate(checkOut)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#4b5563;">Nights:</td>
                  <td style="padding:4px 0;text-align:right;">${nights}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#4b5563;">Guests:</td>
                  <td style="padding:4px 0;text-align:right;">${guests}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#4b5563;">Meals:</td>
                  <td style="padding:4px 0;text-align:right;">${
                    withMeal ? "Included" : "Not included"
                  }</td>
                </tr>
                <tr>
                  <td style="padding:8px 0 0 0;color:#4b5563;border-top:1px solid #d1e4ff;">Amount Paid:</td>
                  <td style="padding:8px 0 0 0;text-align:right;border-top:1px solid #d1e4ff;font-weight:bold;color:#004aad;">
                    ${amountFormatted}
                  </td>
                </tr>
              </table>

              <!-- Payment title -->
              <h3 style="margin:0 0 8px 0;font-size:16px;color:#111827;border-left:3px solid #f5b400;padding-left:8px;">
                Payment
              </h3>

              <!-- Payment card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#e6f3ff;border-radius:8px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#111827;">
                <tr>
                  <td style="padding:4px 0;width:40%;color:#4b5563;">Payment ID:</td>
                  <td style="padding:4px 0;text-align:right;">${paymentId || "-"}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#4b5563;">Order ID:</td>
                  <td style="padding:4px 0;text-align:right;">${orderId || "-"}</td>
                </tr>
              </table>

              ${
                addressBlock
                  ? `
              <!-- Address title -->
              <h3 style="margin:0 0 8px 0;font-size:16px;color:#111827;border-left:3px solid #f5b400;padding-left:8px;">
                Guest Address
              </h3>

              <!-- Address card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#e6f3ff;border-radius:8px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#111827;">
                <tr>
                  <td style="padding:4px 0;color:#111827;">
                    ${addressBlock}
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <!-- Footer note -->
              <p style="margin:8px 0 0 0;font-size:13px;color:#4b5563;">
                We look forward to hosting you.
              </p>
              <p style="margin:4px 0 0 0;font-size:12px;color:#9ca3af;">
                If you have any questions, simply reply to this email.
              </p>
            </td>
          </tr>
        </table>

        <!-- Small footer -->
        <p style="margin-top:12px;font-size:11px;color:#9ca3af;">
          &copy; ${new Date().getFullYear()} Villa Booking. All rights reserved.
        </p>

      </td>
    </tr>
  </table>
</body>
</html>
`;

  await transporter.sendMail({
    from: `"Villa Booking" <${process.env.SMTP_USER}>`,
    to,
    subject: `Booking Confirmed - ${room?.name || "Villa"}`,
    html,
  });
}
