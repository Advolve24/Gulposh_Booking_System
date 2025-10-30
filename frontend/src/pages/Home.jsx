import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/http";
import RoomCard from "../components/RoomCard";
import CalendarRange from "../components/CalendarRange";
import { format } from "date-fns";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  toDateOnly,
  toDateOnlyFromAPI,
  toDateOnlyFromAPIUTC,
} from "../lib/date";

function mergeRanges(ranges) {
  if (!ranges || !ranges.length) return [];
  const sorted = ranges
    .map((r) => ({ from: new Date(r.from), to: new Date(r.to) }))
    .sort((a, b) => a.from - b.from);

  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    const dayAfterLast = new Date(
      last.to.getFullYear(),
      last.to.getMonth(),
      last.to.getDate() + 1
    );
    if (cur.from <= dayAfterLast) {
      if (cur.to > last.to) last.to = cur.to;
    } else {
      out.push(cur);
    }
  }
  return out;
}

export default function Home() {
  const [rooms, setRooms] = useState([]);
  const [disabledAll, setDisabledAll] = useState([]);
  const [guests, setGuests] = useState("");
  const [range, setRange] = useState();

  const navigate = useNavigate();

  useEffect(() => {
    api.get("/rooms").then(({ data }) => setRooms(data));

    (async () => {
      try {
        const [bookingsRes, blackoutsRes] = await Promise.all([
          api.get("/rooms/disabled/all"),
          api.get("/blackouts"),
        ]);

        const bookings = (bookingsRes.data || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from || b.startDate),
          to: toDateOnlyFromAPIUTC(b.to || b.endDate),
        }));

        const blackouts = (blackoutsRes.data || []).map((b) => ({
          from: toDateOnlyFromAPI(b.from),
          to: toDateOnlyFromAPI(b.to),
        }));

        setDisabledAll(mergeRanges([...bookings, ...blackouts]));
      } catch (err) {
        console.error("failed to load disabled ranges", err);
      }
    })();
  }, []);

  const hasValidRange = !!(range?.from && range?.to);
  const hasGuests = !!guests;

  const handleGuestChange = (value) => {
    if (value === "upto10") {
      navigate("/entire-villa-form");
    } else {
      setGuests(value);
    }
  };

  const filteredRooms = useMemo(() => {
    if (!hasValidRange || !hasGuests || guests === "upto10") return rooms;
    const s = toDateOnly(range.from);
    const e = toDateOnly(range.to);
    const g = Number(guests);

    return rooms.filter((r) => {
      const cap =
        typeof r.maxGuests === "number"
          ? r.maxGuests
          : (r.accommodation || [])
              .flatMap((s) =>
                Array.from(String(s).matchAll(/\d+/g)).map((m) => +m[0])
              )
              .filter((n) => Number.isFinite(n) && n > 0)
              .reduce((a, b) => a + b, 0);

      if (cap && cap < g) return false;

      const conflict = disabledAll.some(
        (b) => !(e < b.from || s > b.to)
      );
      return !conflict;
    });
  }, [rooms, disabledAll, range, guests, hasValidRange, hasGuests]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 mb-12">
      <h1 className="text-2xl font-heading">Villa Booking</h1>

      <div className="flex flex-col md:flex-row gap-3 items-start">
        <div className="w-full md:w-[50%]">
          <CalendarRange
            value={range}
            onChange={setRange}
            disabledRanges={disabledAll}
          />
        </div>

        <div className="w-full md:w-56">
          <Select value={guests} onValueChange={handleGuestChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select guests" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
              <SelectItem value="upto10">Up to 10</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-heading">Available rooms</h2>
        <span className="text-sm text-gray-600">
          {filteredRooms.length} of {rooms.length} shown
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {filteredRooms.map((r) => (
          <RoomCard key={r._id} room={r} range={range} guests={guests} />
        ))}
      </div>

      {/* 🔹 Entire Villa Section */}
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer group"
        onClick={() => navigate("/entire-villa-form")}
      >
        <img
          src="/EntireVilla.webp"
          alt="Entire Villa"
          className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <button className="bg-[#fff] text-black px-10 py-4 rounded-md text-lg font-semibold shadow-lg  transition">
            Book Entire Villa
          </button>
        </div>
      </div>
    </div>
  );
}
