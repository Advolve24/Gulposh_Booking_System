import mongoose from "mongoose";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import Blackout from "../models/Blackout.js";

const { isValidObjectId } = mongoose;

const toYmd = (d) => new Date(d).toISOString().slice(0, 10);

function mergeRanges(ranges) {
  if (!ranges.length) return [];
  const by = (r) => r.from;
  ranges.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  const out = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = out[out.length - 1];
    const cur = ranges[i];
    const lastPlus1 = new Date(last.to);
    lastPlus1.setDate(lastPlus1.getDate() + 1);
    if (new Date(cur.from) <= lastPlus1) {
      if (new Date(cur.to) > new Date(last.to)) last.to = cur.to;
    } else {
      out.push(cur);
    }
  }
  return out;
}


export const getDisabledRanges = async (_req, res) => {
  const bookings = await Booking.find({ status: { $ne: "cancelled" } })
    .select("startDate endDate")
    .lean();
  const blackouts = await Blackout.find().select("from to").lean();

  const all = [
    ...bookings.map((b) => ({ from: toYmd(b.startDate), to: toYmd(b.endDate) })),
    ...blackouts.map((b) => ({ from: toYmd(b.from),     to: toYmd(b.to) })),
  ];

  const merged = mergeRanges(
    all.map((r) => ({
      from: toYmd(r.from),
      to:   toYmd(r.to),
    }))
  );

  res.json(merged);
};


export const listRooms = async (_req, res) => {
  try {
    const rooms = await Room.find({ isVilla: { $ne: true } })
      .select("name coverImage pricePerNight priceWithMeal description accommodation maxGuests")
      .sort({ createdAt: -1 });
    res.json(rooms);
  } catch (err) {
    console.error("listRooms error:", err);
    res.status(500).json({ message: "Failed to load rooms" });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid room id" });
    }
    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  } catch (err) {
    console.error("getRoomById error:", err);
    res.status(500).json({ message: "Failed to load room" });
  }
};


export const getBlockedDates = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid room id" });
    }
    const bookings = await Booking.find({
      room: id,
      status: { $ne: "cancelled" },
    }).select("startDate endDate");

    res.json(
      bookings.map((b) => ({
        startDate: b.startDate,
        endDate: b.endDate,
      }))
    );
  } catch (err) {
    console.error("getBlockedDates error:", err);
    res.status(500).json({ message: "Failed to load blocked dates" });
  }
};


export const getBlockedDatesAll = async (_req, res) => {
  const bookings = await Booking.find({ status: { $ne: "cancelled" } })
    .select("startDate endDate");
  res.json(bookings.map(b => ({
    startDate: b.startDate,
    endDate: b.endDate
  })));
};


export const getRoomBookings = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid room id" });
    }
    const bookings = await Booking.find({
      room: id,
      status: { $ne: "cancelled" },
    }).select("startDate endDate");

    res.json(bookings.map(b => ({
      startDate: b.startDate,
      endDate: b.endDate,
    })));
  } catch (err) {
    console.error("getRoomBookings error:", err);
    res.status(500).json({ message: "Failed to load bookings" });
  }
};


