import { useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toDateOnlyFromAPIUTC, todayDateOnly } from "../lib/date";

export default function CalendarRange({ roomId, value, onChange, disabledRanges }) {
  const [roomRanges, setRoomRanges] = useState([]);
  const [globalRanges, setGlobalRanges] = useState([]);

  // Room-specific bookings + room-specific blocks
  useEffect(() => {
    if (!roomId || disabledRanges) return;
    (async () => {
      try {
        // 1) per-room "blocked" (your endpoint currently returns bookings for that room)
        const blockedRes = await api.get(`/rooms/${roomId}/blocked`);
        const blockedRanges = (blockedRes.data || []).map(b => ({
          from: toDateOnlyFromAPIUTC(b.startDate),
          to:   toDateOnlyFromAPIUTC(b.endDate),
        }));

        // 2) per-room bookings (new endpoint you added)
        const bookingsRes = await api.get(`/rooms/${roomId}/bookings`); // <-- FIXED
        const bookingRanges = (bookingsRes.data || []).map(b => ({
          from: toDateOnlyFromAPIUTC(b.startDate),
          to:   toDateOnlyFromAPIUTC(b.endDate),
        }));

        setRoomRanges([...blockedRanges, ...bookingRanges]);
      } catch (e) {
        console.error("CalendarRange fetch error:", e);
        setRoomRanges([]);
      }
    })();
  }, [roomId, disabledRanges]);

  // Admin blackouts (global)
  useEffect(() => {
    if (disabledRanges) return;
    (async () => {
      try {
        const { data } = await api.get("/blackouts");
        const ranges = (data || []).map(b => ({
          from: toDateOnlyFromAPIUTC(b.from),
          to:   toDateOnlyFromAPIUTC(b.to),
        }));
        setGlobalRanges(ranges);
      } catch (e) {
        console.error("CalendarRange blackouts error:", e);
        setGlobalRanges([]);
      }
    })();
  }, [disabledRanges]);

  const checkIn  = value?.from ? format(value.from, "dd MMM yyyy") : "Add date";
  const checkOut = value?.to   ? format(value.to,   "dd MMM yyyy") : "Add date";

  const disabled = useMemo(() => {
    if (disabledRanges) return [{ before: todayDateOnly() }, ...disabledRanges];
    return [{ before: todayDateOnly() }, ...globalRanges, ...roomRanges];
  }, [disabledRanges, globalRanges, roomRanges]);

  return (
    <div className="w-full">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full grid grid-cols-2 items-center gap-0.5 font-normal">
            <span className="flex gap-2">
              <span className="text-xs uppercase text-gray-500">Check in</span>
              <span className="truncate">{checkIn}</span>
            </span>
            <span className="flex gap-2 border-l pl-3">
              <span className="text-xs uppercase text-gray-500">Check out</span>
              <span className="truncate">{checkOut}</span>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-transparent border-0 shadow-none" align="start">
          <Calendar
            mode="range"
            numberOfMonths={1}
            selected={value}
            onSelect={onChange}
            disabled={disabled}
            captionLayout="dropdown-buttons"
            className="rounded-md border"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
