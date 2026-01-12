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

<body style="margin:0;padding:0;background:#f4f6fb;font-family:Inter,Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:14px;overflow:hidden;
          box-shadow:0 10px 30px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding:24px 28px;background:#004aad;color:#ffffff;">
              <table width="100%">
                <tr>
                  <td>
                    <h1 style="margin:0;font-size:20px;font-weight:600;">
                      Booking Confirmed
                    </h1>
                    <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">
                      ${room?.name || "Villa Stay"}
                    </p>
                  </td>
                  <td align="right">
                    <img src="https://gulposhbookingsystem.netlify.app/logo1.png"
                      width="36" height="36" style="border-radius:6px;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px;">

              <!-- Greeting -->
              <p style="margin:0 0 16px;font-size:14px;">
                Dear <strong>${name || "Guest"}</strong>,
              </p>

              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#374151;">
                Thank you for choosing us. We are pleased to confirm your booking.
                Below are your reservation details.
              </p>

              <!-- Booking Summary -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:24px;">
                
                <tr>
                  <td colspan="2"
                    style="padding:14px 16px;background:#f9fafb;
                    font-weight:600;font-size:14px;">
                    Stay Details
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 16px;color:#6b7280;">Property</td>
                  <td style="padding:12px 16px;text-align:right;font-weight:500;">
                    ${room?.name}
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 16px;color:#6b7280;">Check-in</td>
                  <td style="padding:12px 16px;text-align:right;">
                    ${fmtDate(checkIn)}
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 16px;color:#6b7280;">Check-out</td>
                  <td style="padding:12px 16px;text-align:right;">
                    ${fmtDate(checkOut)}
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 16px;color:#6b7280;">Nights</td>
                  <td style="padding:12px 16px;text-align:right;">
                    ${nights}
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 16px;color:#6b7280;">Guests</td>
                  <td style="padding:12px 16px;text-align:right;">
                    ${guests}
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 16px;color:#6b7280;">Meals</td>
                  <td style="padding:12px 16px;text-align:right;">
                    ${withMeal ? "Included" : "Not included"}
                  </td>
                </tr>
              </table>

              <!-- Payment Summary -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:24px;">

                <tr>
                  <td colspan="2"
                    style="padding:14px 16px;background:#f9fafb;
                    font-weight:600;font-size:14px;">
                    Payment Summary
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 16px;color:#6b7280;">Total Paid</td>
                  <td style="padding:12px 16px;text-align:right;
                    font-size:16px;font-weight:600;color:#004aad;">
                    ₹${Number(amount || 0).toLocaleString("en-IN")}
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 16px;color:#6b7280;">Payment ID</td>
                  <td style="padding:12px 16px;text-align:right;">
                    ${paymentId || "-"}
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 16px;color:#6b7280;">Order ID</td>
                  <td style="padding:12px 16px;text-align:right;">
                    ${orderId || "-"}
                  </td>
                </tr>
              </table>

              ${
                addressBlock
                  ? `
              <!-- Address -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 16px;background:#f9fafb;
                    font-weight:600;font-size:14px;">
                    Guest Address
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#374151;">
                    ${addressBlock}
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <!-- Footer Text -->
              <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">
                We look forward to welcoming you and ensuring a comfortable stay.
              </p>

              <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">
                For any assistance, simply reply to this email.
              </p>

            </td>
          </tr>

        </table>

        <!-- Footer -->
        <p style="margin-top:14px;font-size:12px;color:#9ca3af;">
          © ${new Date().getFullYear()} Villa Booking. All rights reserved.
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
