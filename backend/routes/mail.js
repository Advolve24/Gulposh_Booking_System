import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
           
export const sendEntireVillaMail = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      dob,
      checkin,
      checkout,
      address,
      state,
      city,
      country,
      pincode,
    } = req.body;

    console.log("SMTP_USER:", process.env.SMTP_USER);
    console.log("SMTP_PASS exists:", !!process.env.SMTP_PASS);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Villa Enquiry" <${process.env.SMTP_USER}>`,
      to: "web@advolve.in",
      subject: `Entire Villa Booking Enquiry - ${name}`,
      html: `
        <h2>Entire Villa Booking Enquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Date of Birth:</strong> ${dob || "-"}</p>
        <p><strong>Check-in:</strong> ${checkin || "-"}</p>
        <p><strong>Check-out:</strong> ${checkout || "-"}</p>
        <p><strong>Address:</strong> ${address}, ${city}, ${state}, ${country} - ${pincode}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ ok: true, message: "Mail sent successfully" });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ message: "Failed to send email" });
  }
};

export default sendEntireVillaMail;