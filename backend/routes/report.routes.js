import express from "express";
import { getOverviewReport, getMonthlyRevenue, getRevenueByRoom, getPaymentStatus,
  getBookingSources, getMealRevenue, getTopGuests} from "../controllers/report.controller.js";

const router = express.Router();


router.get("/overview", getOverviewReport);

router.get("/monthly-revenue", getMonthlyRevenue);

router.get("/revenue-by-room", getRevenueByRoom);

router.get("/payment-status", getPaymentStatus);

router.get("/booking-sources", getBookingSources);

router.get("/meal-revenue", getMealRevenue);

router.get("/top-guests", getTopGuests);

export default router;