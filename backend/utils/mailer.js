import nodemailer from "nodemailer";

/* ================= TRANSPORTER ================= */
export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

/* ================= VERIFY ON BOOT ================= */
export const verifySMTP = async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP connection verified");
  } catch (err) {
    console.error("❌ SMTP verification failed:", err.message);
  }
};

/* ================= BOOKING CONFIRMATION ================= */
export const sendBookingConfirmationMail = async ({
  to,
  name,
  booking,
  room,
}) => {
  if (!to) throw new Error("Recipient email missing");

  return transporter.sendMail({
    from: `"Gulposh Villa" <${process.env.SMTP_USER}>`,
    to,
    subject: `Booking Confirmed – ${room.name}`,
    html: `
      <h2>Booking Confirmed 🎉</h2>
      <p>Hello <b>${name || "Guest"}</b>,</p>

      <h3>${room.name}</h3>

      <ul>
        <li>Check-in: ${booking.startDate.toDateString()}</li>
        <li>Check-out: ${booking.endDate.toDateString()}</li>
        <li>Nights: ${booking.nights}</li>
        <li>Guests: ${booking.guests}</li>
        <li>Total Paid: ₹${booking.amount}</li>
      </ul>

      <p>Payment ID: ${booking.paymentId}</p>
      <p>— Team Gulposh</p>
    `,
  });
};
