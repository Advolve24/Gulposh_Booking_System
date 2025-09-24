import { useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { toDateOnlyFromAPIUTC, todayDateOnly } from "../lib/date";

export default function CalendarRange({ roomId, value, onChange, disabledRanges }) {
  const [roomRanges, setRoomRanges] = useState([]);
  const [globalRanges, setGlobalRanges] = useState([]);

  useEffect(() => {
    if (!roomId || disabledRanges) return;
    api.get(`/rooms/${roomId}/blocked`).then(({ data }) => {
      const ranges = (data || []).map(b => ({
        from: toDateOnlyFromAPIUTC(b.startDate),
        to: toDateOnlyFromAPIUTC(b.endDate),
      }));
      setRoomRanges(ranges);
    });
  }, [roomId, disabledRanges]);

  useEffect(() => {
    if (disabledRanges) return;
    api.get("/blackouts").then(({ data }) => {
      const ranges = (data || []).map(b => ({
        from: toDateOnlyFromAPIUTC(b.from),
        to: toDateOnlyFromAPIUTC(b.to),
      }));

      setGlobalRanges(ranges);
    });
  }, [disabledRanges]);

  const checkIn = value?.from ? format(value.from, "dd MMM yyyy") : "Add date";
  const checkOut = value?.to ? format(value.to, "dd MMM yyyy") : "Add date";

  const disabled = useMemo(() => {
    if (disabledRanges) return [{ before: todayDateOnly() }, ...disabledRanges];
    return [{ before: todayDateOnly() }, ...globalRanges, ...roomRanges];
  }, [disabledRanges, globalRanges, roomRanges]);

  return (
    <div className="w-full">
      <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div>
          <span className="block text-xs uppercase text-gray-500">Check in</span>
          <span><b>{checkIn}</b></span>
        </div>
        <div>
          <span className="block text-xs uppercase text-gray-500">Check out</span>
          <span><b>{checkOut}</b></span>
        </div>
      </div>

      <Calendar
        mode="range"
        numberOfMonths={1}
        selected={value}
        onSelect={onChange}
        disabled={disabled}
        captionLayout="dropdown-buttons"
        className="rounded-md border w-[350px] bg-white"
      />
    </div>
  );
}
