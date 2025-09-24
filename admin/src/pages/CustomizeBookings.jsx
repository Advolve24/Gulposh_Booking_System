import { useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import { listRooms, listBlackouts } from "../api/admin";
import RoomCard from "../components/RoomCard";
import CalendarRange from "../components/CalendarRange";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toDateOnly, toDateOnlyFromAPI,toDateOnlyFromAPIUTC, addDays } from "../lib/date";

const rangesOverlap = (aStart, aEnd, bStart, bEnd) => !(aEnd < bStart || aStart > bEnd);

function mergeRanges(ranges) {
  if (!ranges || !ranges.length) return [];

  const sorted = ranges
    .map(r => ({ from: new Date(r.from), to: new Date(r.to) }))
    .sort((a, b) => a.from - b.from);

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


export default function CustomizeBookings() {
  const [rooms, setRooms] = useState([]);
  const [blockedByRoom, setBlockedByRoom] = useState({});
  const [blackouts, setBlackouts] = useState([]);
  const [guests, setGuests] = useState("");
  const [range, setRange] = useState();

  useEffect(() => {
   listRooms().then(setRooms);
   listBlackouts().then(setBlackouts);
 }, []);

  // Fetch booked ranges per room (use UTC helper)
  useEffect(() => {
    if (!rooms.length) return;
    (async () => {
      const entries = await Promise.all(
        rooms.map(async (r) => {
          const { data } = await api.get(`/rooms/${r._id}/blocked`);
          const ranges = (data || []).map((b) => {
           const from = toDateOnlyFromAPIUTC(b.startDate); 
           const to   = toDateOnlyFromAPIUTC(b.endDate);   
           return { from, to: to < from ? from : to };
          });
          return [r._id, ranges];
        })
      );
      setBlockedByRoom(Object.fromEntries(entries));
    })();
  }, [rooms]);

  // Union of bookings + global blackouts (blackouts still parsed locally)
  const disabledAll = useMemo(() => {
    const perRoom = Object.values(blockedByRoom).flat();
    const globals = (blackouts || []).map((b) => ({
      from: toDateOnlyFromAPI(b.from), // admin blackouts inclusive (local)
      to:   toDateOnlyFromAPI(b.to),
    }));
    return mergeRanges([...globals, ...perRoom]);
  }, [blockedByRoom, blackouts]);

  const hasValidRange = !!(range?.from && range?.to);
  const hasGuests = !!guests;

  const filteredRooms = useMemo(() => {
    if (!hasValidRange || !hasGuests) return rooms;
    const s = toDateOnly(range.from);
    const e = toDateOnly(range.to);
    const g = Number(guests);

    return rooms.filter((r) => {
      const cap =
        typeof r.maxGuests === "number"
          ? r.maxGuests
          : (r.accommodation || [])
              .flatMap((s) => Array.from(String(s).matchAll(/\d+/g)).map((m) => +m[0]))
              .filter((n) => Number.isFinite(n) && n > 0)
              .reduce((a, b) => a + b, 0);

      if (cap && cap < g) return false;
      const conflict = disabledAll.some((b) => rangesOverlap(s, e, b.from, b.to));
      return !conflict;
    });
  }, [rooms, disabledAll, range, guests, hasValidRange, hasGuests]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 mb-12">
      <h1 className="text-2xl font-heading">Manual Booking</h1>   
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {filteredRooms.map((r) => (
          <RoomCard key={r._id} room={r} range={range} guests={guests} />
        ))}
      </div>
    </div>
  );
}
