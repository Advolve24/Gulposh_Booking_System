
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { toDateOnlyFromAPIUTC, todayDateOnly } from "../lib/date";

export default function CalendarRange({
  roomId,
  value,
  onChange,
  disabledRanges,
  inline = false, // ✅ NEW
}) {
  const [roomRanges, setRoomRanges] = useState([]);
  const [globalRanges, setGlobalRanges] = useState([]);

  /* ---------------- LOAD DISABLED RANGES ---------------- */

  useEffect(() => {
    if (!roomId || disabledRanges) return;

    (async () => {
      try {
        const blocked = await api.get(`/rooms/${roomId}/blocked`);
        const bookings = await api.get(`/rooms/${roomId}/bookings`);

        const toRange = (arr) =>
          (arr || []).map((b) => ({
            from: toDateOnlyFromAPIUTC(b.startDate),
            to: toDateOnlyFromAPIUTC(b.endDate),
          }));

        setRoomRanges([
          ...toRange(blocked.data),
          ...toRange(bookings.data),
        ]);
      } catch {
        setRoomRanges([]);
      }
    })();
  }, [roomId, disabledRanges]);

  useEffect(() => {
    if (disabledRanges) return;

    (async () => {
      try {
        const { data } = await api.get("/blackouts");
        setGlobalRanges(
          (data || []).map((b) => ({
            from: toDateOnlyFromAPIUTC(b.from),
            to: toDateOnlyFromAPIUTC(b.to),
          }))
        );
      } catch {
        setGlobalRanges([]);
      }
    })();
  }, [disabledRanges]);


  const disabled = useMemo(
    () => [
      { before: todayDateOnly() },
      ...globalRanges,
      ...roomRanges,
      ...(disabledRanges || []),
    ],
    [globalRanges, roomRanges, disabledRanges]
  );


  const calendarUI = (
    <Calendar
      mode="range"
      numberOfMonths={1}
      selected={value}
      onSelect={onChange}
      disabled={disabled}
      className="p-4"
      classNames={{
        day_selected: "bg-primary text-primary-foreground",
        day_range_start: "bg-primary text-primary-foreground",
        day_range_end: "bg-primary text-primary-foreground",
        day_range_middle: "bg-primary/15",
        nav_button: "hover:bg-muted",
        day_today: "border border-primary",
      }}
    />
  );

  /* ======================================================
     INLINE MODE (ROOM PAGE – RIGHT CARD)
  ====================================================== */

  if (inline) {
    return (
      <div className="space-y-2">
        {/* HEADER */}
        <div className="grid grid-cols-2 gap-3">
          <DateBox label="Check in" value={value?.from} />
          <DateBox label="Check out" value={value?.to} />
        </div>

        {/* CALENDAR */}
        <div className="border rounded-xl bg-card items-center">
          {calendarUI}
        </div>
      </div>
    );
  }

  /* ======================================================
     POPOVER MODE (HOME PAGE)
  ====================================================== */

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="
            w-full
            min-w-0
            h-14
            grid grid-cols-2
            items-center
            rounded-xl border
            px-4
            overflow-hidden
            text-left
          "
        >
          <DateBox label="Check in" value={value?.from} />
          <DateBox label="Check out" value={value?.to} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="p-0 border rounded-2xl items-centershadow-xl"
      >
        {calendarUI}
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- DATE BOX ---------------- */

function DateBox({ label, value }) {
  return (
    <div className="flex flex-col justify-center min-w-0">
      <span className="text-[11px] uppercase text-muted-foreground leading-none mb-1">
        {label}
      </span>

      <span className="flex items-center gap-2 text-sm leading-tight">
        <CalendarDays
          size={14}
          className="text-muted-foreground relative top-[0.5px]"
        />
        <span className="truncate">
          {value ? format(value, "dd MMM yyyy") : "Add date"}
        </span>
      </span>
    </div>
  );
}