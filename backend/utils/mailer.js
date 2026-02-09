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
  const checkIn = booking.startDate.toDateString();
  const checkOut = booking.endDate.toDateString();

  return transporter.sendMail({
    from: `"Gulposh Villa" <${process.env.SMTP_USER}>`,
    to,
    subject: `Booking Confirmed – ${room.name}`,
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Booking Confirmed</title>
</head>

<body style="margin:0;padding:0;background:#f5f6f7;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">

<!-- Main Card -->
<table width="600" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:12px;overflow:hidden;
box-shadow:0 4px 10px rgba(0,0,0,0.06);">

<!-- Header -->
<tr>
<td style="padding:24px 28px;border-bottom:1px solid #eee;">

<table width="100%">
<tr>
<td width="40" valign="top">
<div style="
width:36px;height:36px;border-radius:50%;
background:#e8f5e9;color:#2e7d32;
text-align:center;line-height:36px;
font-size:20px;font-weight:bold;">
✓
</div>
</td>

<td style="padding-left:12px;">
<h2 style="margin:0;font-size:20px;color:#111;">
Booking Confirmed!
</h2>
<p style="margin:4px 0 0;color:#666;font-size:13px;">
Booking ID: ${booking._id || booking.paymentId}
</p>
</td>
</tr>
</table>

</td>
</tr>

<!-- Greeting -->
<tr>
<td style="padding:24px 28px 0;">
<p style="margin:0 0 12px;font-size:15px;color:#333;">
Hello <b>${name || "Guest"}</b>,
</p>

<p style="margin:0;font-size:15px;color:#555;">
Thank you for your reservation. We're excited to host you!
</p>
</td>
</tr>

<!-- Property Image -->
<tr>
<td style="padding:20px 28px 0;">
<img src="${room.image || "https://images.unsplash.com/photo-1505691938895-1758d7feb511"}"
width="100%"
style="border-radius:10px;display:block;">
</td>
</tr>

<!-- Property Info -->
<tr>
<td style="padding:16px 28px 0;">
<h3 style="margin:0;font-size:18px;color:#111;">
${room.name}
</h3>

<p style="margin:6px 0 0;color:#777;font-size:13px;">
📍 ${room.location || "Khopoli, Maharashtra, India"}
</p>
</td>
</tr>

<!-- Checkin Checkout -->
<tr>
<td style="padding:20px 28px;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>

<td width="48%" style="
background:#f7f8f9;
padding:14px;
border-radius:8px;
font-size:14px;
color:#333;">

<b>Check-in</b><br>
${checkIn}

</td>

<td width="4%"></td>

<td width="48%" style="
background:#f7f8f9;
padding:14px;
border-radius:8px;
font-size:14px;
color:#333;">

<b>Check-out</b><br>
${checkOut}

</td>

</tr>
</table>

</td>
</tr>

<!-- Summary -->
<tr>
<td style="padding:0 28px 20px;">

<table width="100%">
<tr>

<td style="font-size:14px;color:#666;">
👥 ${booking.guests} Guests · ${booking.nights} Nights
</td>

<td align="right"
style="font-size:18px;font-weight:bold;color:#2e7d32;">
₹${booking.amount}
</td>

</tr>
</table>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:24px 28px;border-top:1px solid #eee;">
<p style="margin:0;color:#555;font-size:14px;">
We look forward to welcoming you!
</p>

<p style="margin:6px 0 0;font-weight:bold;">
— Team Gulposh
</p>
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
