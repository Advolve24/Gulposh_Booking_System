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

  const grandTotal = Number(booking.amount).toLocaleString("en-IN");

  const imageUrl =
    room.coverImage ||
    room.galleryImages?.[0] ||
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511";

  const location =
    room.location || booking.location || "Karjat, Maharashtra, India";

  return transporter.sendMail({
    from: `"Gulposh Villa" <${process.env.SMTP_USER}>`,
    to,
    subject: `Booking Confirmed – ${room.name}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 10px;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:14px;overflow:hidden;
box-shadow:0 6px 18px rgba(0,0,0,0.08);">

<!-- ================= HEADER ================= -->
<tr>
<td style="background:#004196;color:#ffffff;text-align:center;padding:30px 20px;">

<div style="
  width:52px;
  height:52px;
  border:2px solid #ffffff;
  border-radius:6px;
  margin:0 auto 14px;
  font-size:28px;
  font-weight:bold;
  line-height:52px;
">
✓
</div>

<h2 style="margin:0;font-size:22px;">Booking Confirmed!</h2>

<p style="margin:6px 0 0;font-size:13px;opacity:0.9;">
Booking ID: ${booking._id || booking.paymentId}
</p>

</td>
</tr>

<!-- ================= GREETING ================= -->
<tr>
<td style="padding:22px 26px 10px;font-size:15px;color:#333;">
Hello <b>${name || "Guest"}</b>,<br><br>
Thank you for your reservation. We're excited to host you!
</td>
</tr>

<!-- ================= IMAGE ================= -->
<tr>
<td style="padding:0 26px;">
<img src="${imageUrl}" width="100%" height="220"
style="border-radius:10px;object-fit:cover;display:block;">
</td>
</tr>

<!-- ================= PROPERTY INFO ================= -->
<tr>
<td style="padding:14px 26px 0;">
<h3 style="margin:0;font-size:18px;color:#111;">
${room.name}
</h3>

<p style="margin:4px 0 0;font-size:13px;color:#666;">
📍 ${location}
</p>
</td>
</tr>

<!-- ================= BOOKING TABLE ================= -->
<tr>
<td style="padding:16px 26px;">
<table width="100%" cellpadding="10" cellspacing="0"
style="border-collapse:collapse;font-size:14px;border:1px solid #e3e5e7;">

<tr style="background:#fafafa;">
<td>Check-in</td>
<td align="right"><b>${checkIn}</b></td>
</tr>

<tr>
<td>Check-out</td>
<td align="right"><b>${checkOut}</b></td>
</tr>

<tr style="background:#fafafa;">
<td>Guests</td>
<td align="right">
<b>${adults} Adults, ${children} Children</b>
</td>
</tr>

<tr>
<td>Nights</td>
<td align="right"><b>${booking.nights}</b></td>
</tr>

<tr style="background:#e8f5e9;font-weight:bold;">
<td>Grand Total</td>
<td align="right" style="color:#1f8f43;font-size:16px;">
₹${grandTotal}
</td>
</tr>

</table>
</td>
</tr>

<!-- ================= LOCATION ================= -->
<tr>
<td style="padding:0 26px 16px;font-size:14px;color:#444;">
<b>📍 Location</b><br>
${location}<br>
<a href="#" style="color:#1f8f43;text-decoration:none;">
Get Directions →
</a>
</td>
</tr>

<!-- ================= HOST ================= -->
<tr>
<td style="padding:16px 26px;background:#f7f8fa;font-size:14px;">
<b>👤 Your Host</b><br>
Priya Sharma<br>
📞 +91 98765 43210<br>
✉️ priya@grandrepose.in
</td>
</tr>

<!-- ================= WIFI ================= -->
<tr>
<td style="padding:16px 26px;">
<table width="100%" cellpadding="12" cellspacing="0"
style="background:#eaf3ff;border-radius:8px;font-size:14px;">
<tr>
<td>
<b>📶 WiFi Details</b><br>
Network: <b>GrandRepose_Guest</b><br>
Password: <b>Welcome@2026</b>
</td>
</tr>
</table>
</td>
</tr>

<!-- ================= BUTTON ================= -->
<tr>
<td align="center" style="padding:10px 26px 24px;">
<a href="#"
style="
background:#1f8f43;
color:#ffffff;
padding:14px 26px;
border-radius:8px;
text-decoration:none;
font-weight:bold;
display:inline-block;
">
View Full Booking Details
</a>
</td>
</tr>

<!-- ================= FOOTER ================= -->
<tr>
<td style="padding:18px 26px;border-top:1px solid #eee;
text-align:center;font-size:13px;color:#666;">
We look forward to welcoming you!<br>
— Team Gulposh
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`,
  });
};
