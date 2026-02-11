import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

export const verifySMTP = async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP connection verified");
  } catch (err) {
    console.error("❌ SMTP verification failed:", err.message);
  }
};

export const sendBookingConfirmationMail = async ({
  to,
  name,
  booking,
  room,
}) => {
  const checkIn = new Date(booking.startDate).toDateString();
  const checkOut = new Date(booking.endDate).toDateString();

  const adults = booking.adults || 0;
  const children = booking.children || 0;

  const vegCount = booking.vegGuests || 0;
  const nonVegCount = booking.nonVegGuests || 0;

  const mealTotal = Number(booking.mealTotal || 0);
  const gst = Number(booking.totalTax || 0);
  const roomTotal = Number(booking.roomTotal || 0);
  const subtotal = roomTotal + mealTotal;
  const grandTotal = Number(booking.amount || 0);

  const foodText =
    room.mealMode === "only"
      ? "Included in room charges"
      : mealTotal > 0
        ? `₹${mealTotal.toLocaleString("en-IN")}`
        : "Included in room charges";

  const imageUrl =
    room.coverImage ||
    room.galleryImages?.[0] ||
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511";

  const location =
    room.location || booking.location || "Karjat, Maharashtra, India";

  return transporter.sendMail({
    from: `"Villa Gulposh" <${process.env.SMTP_USER}>`,
    to,
    subject: `Booking Confirmed – ${room.name}`,
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Booking Confirmed</title>
</head>

<body style="
margin:0;
padding:0;
background:#f3f4f6;
font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:30px 10px;">

<!-- MAIN CARD -->
<table width="640" cellpadding="0" cellspacing="0" style="
background:#ffffff;
border-radius:16px;
overflow:hidden;
">

<!-- ================= HEADER ================= -->
<tr>
<td style="
background:#1f5f54;
padding:28px;
">

<table width="100%">
<tr>

<td width="48" valign="top">
<div style="
width:44px;
height:44px;
background:#ffffff22;
border-radius:50%;
text-align:center;
line-height:44px;
font-size:22px;
color:#ffffff;
font-weight:bold;
">
✓
</div>
</td>

<td style="padding-left:14px;">

<h1 style="
margin:0;
font-size:22px;
color:#ffffff;
font-weight:600;
">
Booking Confirmed!
</h1>

<p style="
margin:0px 0 0;
font-size:13px;
color:#e5e7eb;
">
ID: ${booking._id || booking.paymentId}
</p>

</td>
</tr>
</table>

</td>
</tr>

<!-- ================= GREETING ================= -->
<tr>
<td style="padding:22px 28px 10px;font-size:15px;color:#111827;">
Hello <b>${name}</b>, thank you for your reservation!
</td>
</tr>

<!-- ================= IMAGE CARD ================= -->
<tr>
<td style="padding:0 28px;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="border-radius:14px;overflow:hidden;">
<img src="${imageUrl}" width="100%" height="200" style="
display:block;
object-fit:cover;
">
</td>
</tr>
</table>

</td>
</tr>

<!-- PROPERTY INFO -->
<tr>
<td style="padding:14px 28px 0;">

<h2 style="
margin:0;
font-size:20px;
font-weight:600;
color:#111827;
">
${room.name}
</h2>

<p style="
margin:0px 0 0;
font-size:13px;
color:#6b7280;
">
📍 ${location}
</p>

</td>
</tr>

<!-- ================= STAY DETAILS ================= -->
<tr>
<td style="padding:18px 28px 0;">

<h3 style="
margin:0 0 12px;
font-size:16px;
font-weight:600;
color:#111827;
">
Stay Details
</h3>

<table width="100%" cellpadding="0" cellspacing="0">

<tr>

<td width="50%" style="padding-right:6px;">

<table width="100%" style="
background:#f5f3ef;
border:1px solid #f5f3ef;
border-radius:12px;
">

<tr>
<td style="padding:14px;text-align:center;">
<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">CHECK-IN</div>
<div style="font-size:14px;font-weight:600;">${checkIn}</div>
</td>
</tr>

</table>

</td>

<td width="50%" style="padding-left:6px;">

<table width="100%" style="
background:#f5f3ef;
border:1px solid #f5f3ef;
border-radius:12px;
">

<tr>
<td style="padding:14px;text-align:center;">
<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">CHECK-OUT</div>
<div style="font-size:14px;font-weight:600;">${checkOut}</div>
</td>
</tr>

</table>

</td>

</tr>

</table>

</td>
</tr>

<!-- ================= DETAILS ROW (Guests + Night) ================= -->
<tr>
  <td style="padding:0 28px 10px;">

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <!-- Guests -->
        <td style="padding:6px 0;font-size:14px;color:#111827;">
          <span style="display:inline-block;vertical-align:middle;margin-right:8px;">
            <!-- user icon -->
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21a8 8 0 0 0-16 0"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </span>

          <b>${adults}</b> Adults, <b>${children}</b> Child
        </td>

        <!-- Night -->
        <td align="right" style="padding:6px 0;font-size:14px;color:#111827;white-space:nowrap;">
          <span style="display:inline-block;vertical-align:middle;margin-right:8px;">
          </span>

          <b>${booking.nights}</b> Night
        </td>
      </tr>
    </table>

  </td>
</tr>

<!-- ================= FOOD PREFERENCE ROW (white, bordered like screenshot) ================= -->
<tr>
  <td style="padding:0 28px 14px;">

    <table width="100%" cellpadding="0" cellspacing="0" style="
      border-collapse:separate;
      border-spacing:0;
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:12px;
      overflow:hidden;
    ">
      <tr>
        <!-- Left -->
        <td style="padding:14px 14px;font-size:14px;color:#111827;">
          <span style="display:inline-block;vertical-align:middle;margin-right:10px;">
            🍴
          </span>

          <span style="vertical-align:middle;color:#374151;">Food Preference</span>
        </td>

        <!-- Right -->
        <td align="right" style="padding:14px 14px;font-size:14px;color:#111827;white-space:nowrap;">
          <span style="display:inline-block;vertical-align:middle;margin-left:6px;margin-right:14px;color:#111827;">
           Non-veg <b>${nonVegCount}</b>
          </span>
           |
          <span style="display:inline-block;vertical-align:middle;margin-left:6px;color:#111827;">
            Veg <b>${vegCount}</b>
          </span>
        </td>
      </tr>
    </table>

  </td>
</tr>

<!-- ================= BILL SUMMARY (white box + dividers like screenshot) ================= -->
<tr>
  <td style="padding:0 28px;">

    <table width="100%" cellpadding="0" cellspacing="0" style="
      border-collapse:separate;
      border-spacing:0;
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:12px;
      overflow:hidden;
      font-size:14px;
      color:#111827;
    ">

      <!-- Food Charges -->
      <tr>
  <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">
    Food Charges
  </td>
  <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">
    ${foodText}
  </td>
</tr>


<!-- Room Charges -->
<tr>
  <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">
    Room Charges
  </td>
  <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">
    ₹${roomTotal.toLocaleString("en-IN")}
  </td>
</tr>



<!-- Subtotal -->
      <tr>
        <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">
          Subtotal
        </td>
        <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#111827;">
          ₹${subtotal.toLocaleString("en-IN")}
        </td>
      </tr>


      <!-- GST -->
      <tr>
        <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">
          GST (18%)
        </td>
        <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">
          ₹${gst.toLocaleString("en-IN")}
        </td>
      </tr>

      <!-- Grand Total (green bar) -->
      <tr>
        <td style="padding:18px 16px;background:#1f5f54;color:#ffffff;font-weight:700;">
          Grand Total
        </td>
        <td align="right" style="padding:18px 16px;background:#1f5f54;color:#ffffff;font-weight:800;font-size:16px;">
          ₹${grandTotal.toLocaleString("en-IN")}
        </td>
      </tr>

    </table>

  </td>
</tr>



<!-- ================= LOCATION + WIFI ================= -->
<tr>
<td style="padding:18px 28px 0;">

<table width="100%">
<tr>

<td width="50%" style="padding-right:6px;">

<table width="100%" style="
background:#f9fafb;
border:1px solid #e5e7eb;
border-radius:12px;
">

<tr>
<td style="padding:14px;">
<b>📍 Location</b><br><br>
${location}<br>
<a href="https://maps.app.goo.gl/irFHzTvRRZwTi8nr9" style="
color:#1f5f54;
text-decoration:none;
font-weight:600;
">
Get Directions →
</a>
</td>
</tr>

</table>

</td>

<td width="50%" style="padding-left:6px;">

<table width="100%" style="
background:#f9fafb;
border:1px solid #e5e7eb;
border-radius:12px;
">

<tr>
<td style="padding:14px;">
<b>📶 WiFi</b><br><br>
GrandRepose_Guest<br>
Pass: <b>Welcome@2026 <svg xmlns="http://www.w3.org/2000/svg"
width="16"
height="16"
viewBox="0 0 24 24"
fill="none"
stroke="#6b7280"
stroke-width="2"
stroke-linecap="round"
stroke-linejoin="round"
style="margin-left:10px;">

<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>

</svg></b>
</td>
</tr>

</table>

</td>

</tr>
</table>

</td>
</tr>

<!-- ================= HOST ================= -->
<tr>
<td style="padding:14px 28px;">

<table width="100%" style="
background:#f9fafb;
border:1px solid #e5e7eb;
border-radius:12px;
">

<tr>
<td style="padding:14px;">
<b>Your Host — Priya Sharma</b><br>
📞 +91 98765 43210<br>
✉️ priya@grandrepose.in
</td>
</tr>

</table>

</td>
</tr>

<!-- ================= CTA ================= -->
<tr>
<td align="center" style="padding:14px 28px 24px;">

<a href="https://booking.villagulposh.com" style="
background:#1f5f54;
color:#ffffff;
padding:16px 26px;
border-radius:12px;
text-decoration:none;
font-weight:600;
font-size:15px;
display:inline-block;
">
View Full Booking Details →
</a>

</td>
</tr>

<!-- ================= FOOTER ================= -->
<tr>
<td style="
padding:18px;
text-align:center;
font-size:13px;
color:#6b7280;
border-top:1px solid #e5e7eb;
">

We look forward to welcoming you! — Team Gulposh

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`
    ,
  });
};
