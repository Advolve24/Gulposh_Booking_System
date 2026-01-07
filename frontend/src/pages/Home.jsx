import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/http";
import RoomCard from "../components/RoomCard";
import CalendarRange from "../components/CalendarRange";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  toDateOnly,
  toDateOnlyFromAPI,
  toDateOnlyFromAPIUTC,
} from "../lib/date";

/* ================= HELPERS ================= */

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

/* ================= PAGE ================= */

export default function Home() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [disabledAll, setDisabledAll] = useState([]);
  const [guests, setGuests] = useState("");
  const [range, setRange] = useState();

  /* ================= LOAD DATA ================= */

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

  /* ================= FILTER LOGIC ================= */

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
              .reduce((a, b) => a + b, 0);

      if (cap && cap < g) return false;

      const conflict = disabledAll.some(
        (b) => !(e < b.from || s > b.to)
      );

      return !conflict;
    });
  }, [rooms, disabledAll, range, guests, hasValidRange, hasGuests]);

  /* ================= UI ================= */

  return (
    <div className="bg-[#fffaf7] min-h-screen">

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* TITLE */}
        <h1 className="text-3xl font-serif font-semibold">
          Villa Booking
        </h1>

        {/* SEARCH CARD */}
        <div className="
          bg-white
          rounded-2xl
          shadow-sm
          p-4
          grid
          grid-cols-1
          md:grid-cols-4
          gap-4
          items-end
        ">
          <div>
            <label className="text-xs text-muted-foreground">
              CHECK IN
            </label>
            <CalendarRange
              value={range}
              onChange={setRange}
              disabledRanges={disabledAll}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              CHECK OUT
            </label>
            <CalendarRange
              value={range}
              onChange={setRange}
              disabledRanges={disabledAll}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              GUESTS
            </label>
            <Select value={guests} onValueChange={handleGuestChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select guests" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
                <SelectItem value="upto10">
                  Up to 10
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="
              h-11
              rounded-xl
              bg-primary
              text-primary-foreground
              hover:bg-primary/90
            "
          >
            Search
          </Button>
        </div>

        {/* AVAILABLE ROOMS HEADER */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-semibold">
            Available rooms
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredRooms.length} of {rooms.length} shown
          </span>
        </div>

        {/* ROOMS GRID */}
        <div className="
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-3
          gap-6
        ">
          {filteredRooms.map((r) => (
            <RoomCard
              key={r._id}
              room={r}
              range={range}
              guests={guests}
            />
          ))}
        </div>

        {/* ENTIRE VILLA CTA */}
        <div
          className="
            relative
            rounded-2xl
            overflow-hidden
            cursor-pointer
            group
          "
          onClick={() => navigate("/entire-villa-form")}
        >
          <img
            src="/EntireVilla.webp"
            alt="Entire Villa"
            className="
              w-full
              h-72
              object-cover
              transition-transform
              duration-500
              group-hover:scale-105
            "
          />
          <div className="
            absolute
            inset-0
            bg-black/40
            flex
            items-center
            justify-center
          ">
            <button className="
              bg-white
              text-black
              px-10
              py-4
              rounded-xl
              text-lg
              font-semibold
              shadow-lg
              hover:scale-[1.03]
              transition
            ">
              Book Entire Villa
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
