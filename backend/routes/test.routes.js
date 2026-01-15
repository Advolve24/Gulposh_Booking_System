import express from "express";
import { sendBookingConfirmationMail } from "../utils/mailer.js";

const router = express.Router();

router.get("/test-mail", async (req, res) => {
  try {
    await sendBookingConfirmationMail({
      to: "botresavnee@gmail.com",
      name: "Test User",
      room: { name: "Test Villa" },
      booking: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        guests: 2,
        withMeal: false,
        nights: 1,
        amount: 9999,
        paymentId: "test_payment",
        orderId: "test_order",
      },
    });

    res.json({ ok: true, message: "Test mail attempted" });
  } catch (err) {
    console.error("❌ test-mail failed:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

export default router;
