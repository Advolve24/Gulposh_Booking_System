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

  const vegCount = booking.food?.veg || 0;
  const nonVegCount = booking.food?.nonVeg || 0;

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
<!-- ================= HEADER ================= -->
<tr>
<td style="
background:#f2f3f5;
padding:22px 28px;
border-bottom:1px solid #e5e7eb;
">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<!-- ICON -->
<td width="52" valign="top">

<div style="
width:40px;
height:40px;
background:#e6f4ea;
border-radius:50%;
text-align:center;
line-height:40px;
font-size:22px;
color:#1f8f43;
font-weight:bold;
">
✓
</div>

</td>

<!-- TEXT -->
<td valign="middle" style="padding-left:14px;">

<h2 style="
margin:0;
font-size:20px;
color:#111827;
font-weight:600;
">
Booking Confirmed!
</h2>

<p style="
margin:4px 0 0;
font-size:13px;
color:#6b7280;
">
Booking ID: ${booking._id || booking.paymentId}
</p>

</td>

</tr>
</table>

</td>
</tr>


<!-- ================= GREETING ================= -->
<tr>
<td style="padding:22px 26px 10px;font-size:15px;color:#333;">
Hello <b>${name || "Guest"}</b>,<br>
Thank you for your reservation. We're excited to host you!
</td>
</tr>

<!-- ================= IMAGE ================= -->
<tr>
<td style="padding:0 26px;">
<img src="${imageUrl}" width="100%" height="200"
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
<td>Food Preference</td>
<td align="right">
🥗 <b>${vegCount}</b> Veg · 🍗 <b>${nonVegCount}</b> Non-Veg
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
<td style="padding:0 26px 14px;">
<table width="100%" cellpadding="0" cellspacing="0"
style="
background:#f3f4f6;
border-radius:10px;
padding:18px;
font-size:14px;
color:#333;
">

<tr>
<td>
<div style="font-weight:bold;margin-bottom:6px;">
📍 Location
</div>

<div style="line-height:1.5;margin-bottom:8px;">
${location}
</div>

<a href="https://maps.app.goo.gl/HFwk69Wm9ZuDwV8Q6"
style="
color:#1f4fff;
text-decoration:none;
font-weight:500;
">
Get Directions →
</a>

</td>
</tr>
</table>
</td>
</tr>


<!-- ================= HOST + WIFI GRID ================= -->

<style>
@media only screen and (max-width:600px){
  .stack-column{
    display:block !important;
    width:100% !important;
  }
}
</style>

<tr>
<td style="padding:0 26px 14px;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<!-- ===== HOST COLUMN ===== -->
<td class="stack-column"
width="50%"
style="padding-right:7px;vertical-align:top;">

<table width="100%" cellpadding="0" cellspacing="0"
style="
background:#f3f4f6;
border-radius:10px;
padding:18px;
font-size:14px;
color:#333;
">

<tr>
<td>

<div style="font-weight:bold;margin-bottom:10px;">
👤 Your Host
</div>

<div style="font-weight:600;margin-bottom:6px;">
Priya Sharma
</div>

<div style="margin-bottom:6px;">
📞 +91 98765 43210
</div>

<div>
✉️ priya@grandrepose.in
</div>

</td>
</tr>

</table>

</td>

<!-- ===== WIFI COLUMN ===== -->
<td class="stack-column"
width="50%"
style="padding-left:7px;vertical-align:top;">

<table width="100%" cellpadding="0" cellspacing="0"
style="
background:#dbe5f1;
border-radius:10px;
padding:18px;
font-size:14px;
color:#333;
">

<tr>
<td>

<div style="font-weight:bold;margin-bottom:8px;">
📶 WiFi Details
</div>

<div style="margin-bottom:4px;">
Network: <b>GrandRepose_Guest</b>
</div>

<div>
Password: <b>Welcome@2026</b>
</div>

</td>
</tr>

</table>

</td>

</tr>
</table>

</td>
</tr>

<!-- ================= BUTTON ================= -->
<tr>
<td align="center" style="padding:10px 26px 24px;">
<a href="https://booking.villagulposh.com"
style="
background:#004196;
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
