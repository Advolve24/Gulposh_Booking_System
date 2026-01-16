import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000, 
  greetingTimeout: 10000,
  socketTimeout: 10000,
});


export const sendBookingConfirmationMail = async ({
  to,
  name,
  booking,
  room,
}) => {
  if (!to) {
    throw new Error("Recipient email missing");
  }

  await transporter.sendMail({
    from: `"Gulposh Villa" <${process.env.SMTP_USER}>`,
    to,
    subject: `Booking Confirmed – ${room.name}`,
    html: `
      <h2>Booking Confirmed 🎉</h2>

      <p>Hello <b>${name}</b>,</p>

      <p>Your booking has been successfully confirmed.</p>

      <h3>${room.name}</h3>

      <ul>
        <li><b>Check-in:</b> ${booking.startDate.toDateString()}</li>
        <li><b>Check-out:</b> ${booking.endDate.toDateString()}</li>
        <li><b>Nights:</b> ${booking.nights}</li>
        <li><b>Guests:</b> ${booking.guests}</li>
        <li><b>Total Paid:</b> ₹${booking.amount}</li>
      </ul>

      <p><b>Payment ID:</b> ${booking.paymentId}</p>

      <p>We look forward to hosting you 🌿</p>
      <p>— Team Gulposh</p>
    `,
  });
};
