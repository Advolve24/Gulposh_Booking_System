import Booking from "../models/Booking.js";
import Enquiry from "../models/Enquiry.js";
import mongoose from "mongoose";

/* ======================================================
   REPORT OVERVIEW
====================================================== */
export const getOverviewReport = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: "confirmed" }).populate("room");

    const totalBookings = bookings.length;

    const totalRevenue = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);

    const avgRevenuePerBooking =
      totalBookings > 0 ? totalRevenue / totalBookings : 0;

    res.json({
      totalRevenue,
      totalBookings,
      avgRevenuePerBooking,
    });
  } catch (err) {
    console.error("Report Overview Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ======================================================
   MONTHLY REVENUE
====================================================== */

export const getMonthlyRevenue = async (req, res) => {
  try {
    const revenue = await Booking.aggregate([
      { $match: { status: "confirmed" } },

      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalRevenue: { $sum: "$amount" },
        },
      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    res.json(revenue);
  } catch (err) {
    console.error("Monthly Revenue Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ======================================================
   REVENUE BY ROOM
====================================================== */

export const getRevenueByRoom = async (req, res) => {
  try {
    const data = await Booking.aggregate([
      { $match: { status: "confirmed" } },

      {
        $group: {
          _id: "$room",
          revenue: { $sum: "$amount" },
        },
      },

      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "_id",
          as: "room",
        },
      },

      {
        $unwind: "$room",
      },

      {
        $project: {
          roomName: "$room.name",
          revenue: 1,
        },
      },
    ]);

    res.json(data);
  } catch (err) {
    console.error("Revenue by Room Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ======================================================
   PAYMENT STATUS
====================================================== */

export const getPaymentStatus = async (req, res) => {
  try {
    const data = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(data);
  } catch (err) {
    console.error("Payment Status Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ======================================================
   BOOKING SOURCES
====================================================== */

export const getBookingSources = async (req, res) => {
  try {
    const enquiries = await Enquiry.aggregate([
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(enquiries);
  } catch (err) {
    console.error("Booking Sources Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ======================================================
   MEAL REVENUE BREAKDOWN
====================================================== */

export const getMealRevenue = async (req, res) => {
  try {
    const data = await Booking.aggregate([
      { $match: { status: "confirmed", withMeal: true } },

      {
        $group: {
          _id: null,
          vegRevenue: {
            $sum: {
              $multiply: ["$vegGuests", "$mealMeta.vegPrice"],
            },
          },

          nonVegRevenue: {
            $sum: {
              $multiply: ["$nonVegGuests", "$mealMeta.nonVegPrice"],
            },
          },
        },
      },
    ]);

    res.json(data[0] || { vegRevenue: 0, nonVegRevenue: 0 });
  } catch (err) {
    console.error("Meal Revenue Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ======================================================
   TOP GUESTS
====================================================== */

export const getTopGuests = async (req, res) => {
  try {
    const data = await Booking.aggregate([
      { $match: { status: "confirmed" } },

      {
        $group: {
          _id: "$contactPhone",
          guest: { $first: "$contactName" },
          bookings: { $sum: 1 },
          totalSpent: { $sum: "$amount" },
        },
      },

      {
        $sort: { totalSpent: -1 },
      },

      {
        $limit: 5,
      },
    ]);

    res.json(data);
  } catch (err) {
    console.error("Top Guests Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};