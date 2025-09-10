// src/pages/RoomPage.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import CalendarRange from "../components/CalendarRange";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import ImageSlider from "../components/ImageSlider";
import { toDateOnlyFromAPI, toDateOnlyFromAPIUTC /*, addDays */ } from "../lib/date";

function mergeRanges(ranges) {
  if (!ranges || !ranges.length) return [];
  const sorted = ranges
    .map(r => ({ from: new Date(r.from), to: new Date(r.to) }))
    .sort((a, b) => a.from - b.from);

  if (!sorted.length) return [];

  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur  = sorted[i];
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

export default function RoomPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [room, setRoom] = useState(null);

  const [range, setRange]   = useState();
  const [guests, setGuests] = useState("");

  // Global disabled ranges
  const [bookedAll, setBookedAll] = useState([]);     // all rooms' bookings
  const [blackoutRanges, setBlackoutRanges] = useState([]); // admin blackouts

  // ---------- Fetch helpers ----------
  const fetchAllBookedRanges = async () => {
    try {
      // Try new endpoint
      let res = await api.get("/rooms/disabled/all");
      let list = Array.isArray(res.data) ? res.data : [];

      // Fallback to older endpoint
      if (!list.length) {
        res = await api.get("/rooms/blocked/all");
        list = Array.isArray(res.data) ? res.data : [];
      }

      if (list.length) {
        // Treat start & end as INCLUSIVE. If your DB stores checkout (exclusive),
        // change "to" to: addDays(toDateOnlyFromAPIUTC(b.endDate), -1)
        return list.map(b => ({
          from: toDateOnlyFromAPIUTC(b.from || b.startDate),
          to:   toDateOnlyFromAPIUTC(b.to   || b.endDate),
        }));
      }
    } catch (_) {
      // fall through to full fallback below
    }

    // Final fallback: fetch all rooms and merge their /blocked ranges
    try {
      const { data: rooms } = await api.get("/rooms");
      const entries = await Promise.all(
        (rooms || []).map(r =>
          api.get(`/rooms/${r._id}/blocked`).then(({ data }) => data || [])
        )
      );
      const flat = entries.flat();
      return flat.map(b => ({
        from: toDateOnlyFromAPIUTC(b.startDate),
        to:   toDateOnlyFromAPIUTC(b.endDate), // INCLUSIVE
        // For checkout-exclusive, use: to: addDays(toDateOnlyFromAPIUTC(b.endDate), -1)
      }));
    } catch {
      return [];
    }
  };

  // ---------- Load room + global disabled ranges ----------
  useEffect(() => {
    api.get(`/rooms/${id}`).then(({ data }) => setRoom(data)).catch(() => setRoom(null));

    // All bookings across all rooms
    (async () => {
      const all = await fetchAllBookedRanges();
      setBookedAll(all);
    })();

    // Admin blackouts (inclusive)
    api.get("/blackouts").then(({ data }) => {
      const ranges = (data || []).map(b => ({
        from: toDateOnlyFromAPI(b.from),
        to:   toDateOnlyFromAPI(b.to),
      }));
      setBlackoutRanges(ranges);
    });
  }, [id]);

  // Seed dates + guests from state / query (once)
  useEffect(() => {
    const stateFrom = location.state?.from;
    const stateTo = location.state?.to;
    const stateGuests = location.state?.guests;

    const qpFrom = searchParams.get("from");
    const qpTo = searchParams.get("to");
    const qpGuests = searchParams.get("guests");

    const fromISO = stateFrom || qpFrom;
    const toISO   = stateTo   || qpTo;

    if (fromISO && toISO) {
      const from = new Date(fromISO);
      const to   = new Date(toISO);
      if (!isNaN(from) && !isNaN(to)) setRange({ from, to });
    }

    const g = stateGuests || qpGuests;
    if (g) setGuests(String(g));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep query params in sync
  useEffect(() => {
    const sp = new URLSearchParams(searchParams);
    if (range?.from && range?.to) {
      sp.set("from", range.from.toISOString());
      sp.set("to", range.to.toISOString());
    } else {
      sp.delete("from"); sp.delete("to");
    }
    setSearchParams(sp, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const onGuestsChange = (v) => {
    setGuests(v);
    const sp = new URLSearchParams(searchParams);
    if (v) sp.set("guests", v); else sp.delete("guests");
    setSearchParams(sp, { replace: true });
  };

  // per-room capacity cap
  const maxGuestsCap = useMemo(() => {
    if (!room) return null;
    if (typeof room.maxGuests === "number" && room.maxGuests > 0) return room.maxGuests;

    const nums = (room.accommodation || [])
      .flatMap((s) => Array.from(String(s).matchAll(/\d+/g)).map((m) => Number(m[0])))
      .filter((n) => Number.isFinite(n) && n > 0);

    const sum = nums.length ? nums.reduce((a, b) => a + b, 0) : 0;
    return Math.max(1, sum || 1);
  }, [room]);

  useEffect(() => {
    if (!room || !maxGuestsCap || !guests) return;
    const g = Number(guests);
    if (Number.isFinite(g) && g > maxGuestsCap) {
      setGuests(String(maxGuestsCap));
    }
  }, [room, maxGuestsCap, guests]);

  // Disabled ranges = global blackouts + ALL-ROOMS bookings
  const disabledAll = useMemo(
    () => mergeRanges([...(blackoutRanges || []), ...(bookedAll || [])]),
    [blackoutRanges, bookedAll]
  );

  const goToCheckout = () => {
    if (!range?.from || !range?.to) return alert("Select dates first");
    if (!guests) return alert("Select number of guests");
    navigate("/checkout", {
      state: {
        roomId: room._id,
        startDate: range.from,
        endDate: range.to,
        guests: Number(guests),
      },
    });
  };

  const allImages = useMemo(() => {
    if (!room) return [];
    return [room.coverImage, ...(room.galleryImages || [])].filter(Boolean);
  }, [room]);

  if (!room) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      <ImageSlider images={allImages} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{room.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-center sm:text-left">
          <span className="text-lg sm:text-xl">₹{room.pricePerNight}/night</span>
          <div className="hidden sm:block h-5 w-px bg-border" />
          <span className="text-lg sm:text-xl">(₹{room.priceWithMeal}/night with meal)</span>
        </div>
      </div>

      <div className="text-gray-700 text-sm sm:text-base leading-relaxed">
        {room.description}
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="w-full md:w-[64%] space-y-4">
          {!!room.roomServices?.length && (
            <div>
              <h3 className="font-semibold mb-2 text-base sm:text-lg">Room services</h3>
              <div className="flex flex-wrap gap-2">
                {room.roomServices.map((s, i) => (
                  <span key={i} className="inline-flex items-center rounded-full border px-3 py-1 text-sm sm:text-[16px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!!room.accommodation?.length && (
            <div>
              <h3 className="font-semibold mb-2 text-base sm:text-lg">Accommodation</h3>
              <ul className="list-disc pl-5 text-sm sm:text-[16px] grid grid-cols-1 sm:grid-cols-2 gap-1">
                {room.accommodation.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="w-full md:w-[34%] shadow-lg border p-4 rounded-xl space-y-4">
          <CalendarRange
            value={range}
            onChange={setRange}
            numberOfMonths={1}
            disabledRanges={disabledAll}   // <- global bookings + blackouts
          />

          <div>
            <label className="block text-sm mb-1">Guests {maxGuestsCap ? `(max ${maxGuestsCap})` : ""}</label>
            <Select value={guests} onValueChange={onGuestsChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select guests" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.max(1, maxGuestsCap || 1) }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={goToCheckout} className="w-full">Book Now</Button>
        </div>
      </div>
    </div>
  );
}
