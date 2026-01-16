import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/http";
import { format, addMonths, subMonths } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toDateOnlyFromAPIUTC, todayDateOnly } from "../lib/date";

/* ===============================
   MEDIA QUERY
================================ */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isDesktop;
}

/* ===============================
   CALENDAR RANGE
================================ */
export default function CalendarRange({
  roomId,
  value,
  onChange,
  disabledRanges,
  inline = false,
}) {
  const [roomRanges, setRoomRanges] = useState([]);
  const [globalRanges, setGlobalRanges] = useState([]);
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();

  /* 🔹 CONTROL MONTH */
  const [month, setMonth] = useState(new Date());

  // track whether user is currently choosing an end date
  const selectingRef = useRef(false);

  /* ===============================
     HANDLE DATE SELECTION
  ============================== */
  const handleSelect = (range) => {
    if (!range) return;

    // always keep popover open while selecting
    setOpen(true);

    // update parent state
    onChange(range);

    const from = range?.from ? new Date(range.from) : null;
    const to = range?.to ? new Date(range.to) : null;

    // If user clicked only start date OR got same-day "to === from", keep open
    if (from && (!to || to.getTime() === from.getTime())) {
      selectingRef.current = true;
      return;
    }

    // Close ONLY when a real end date is chosen (to exists AND to != from)
    if (from && to && to.getTime() !== from.getTime()) {
      selectingRef.current = false;
      setTimeout(() => setOpen(false), 120);
    }
  };

  /* ===============================
     LOAD DISABLED RANGES
  ============================== */
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

        setRoomRanges([...toRange(blocked.data), ...toRange(bookings.data)]);
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

  /* ===============================
     CALENDAR UI
  ============================== */
  const calendarUI = (
    <div className="calendar-wrapper">
      {/* OUTSIDE NAV */}
      <button
        type="button"
        className="calendar-nav left"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setMonth((m) => subMonths(m, 1))}
      >
        <ChevronLeft size={20} />
      </button>

      <button
        type="button"
        className="calendar-nav right"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setMonth((m) => addMonths(m, 1))}
      >
        <ChevronRight size={20} />
      </button>

      <Calendar
        mode="range"
        month={month}
        onMonthChange={setMonth}
        numberOfMonths={isDesktop ? 2 : 1}
        selected={value}
        onSelect={handleSelect}
        disabled={disabled}
        showOutsideDays={false}
        className="airbnb-calendar p-4"
        classNames={{
          months: isDesktop ? "flex gap-8" : "flex justify-center",
          caption: "hidden",
          table: "w-full border-collapse",
          head_row: "grid grid-cols-7",
          row: "grid grid-cols-7",
          cell: "h-9 w-9 text-center",
          day: "h-9 w-9 rounded-full ring-0 ring-offset-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none",
          day_button:
    "h-9 w-9 rounded-full outline-none ring-0 ring-offset-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
          day_range_start:
    "bg-red-700 text-white rounded-full hover:bg-red-700",
  day_range_end:
    "bg-red-700 text-white rounded-full hover:bg-red-700",
  day_selected:
    "bg-red-700 text-white rounded-full",
  day_range_middle:
    "bg-red-100 text-red-900 hover:bg-red-100",

  day_today: "border border-red-700",
          day_disabled: "opacity-40",
        }}
      />
    </div>
  );

  /* ===============================
     INLINE MODE
  ============================== */
  if (inline) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <DateBox label="Check in" value={value?.from} />
          <DateBox label="Check out" value={value?.to} />
        </div>
        <div className="border rounded-xl bg-card">{calendarUI}</div>
      </div>
    );
  }

  /* ===============================
     POPOVER MODE
  ============================== */
  return (
    <Popover open={open} onOpenChange={(v) => setOpen(v)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="w-full h-14 grid grid-cols-2 rounded-xl px-4 bg-white border text-center divide-x-2 divide-muted-black"
        >
          <DateBox label="Check in" value={value?.from} />
          <DateBox label="Check out" value={value?.to} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={12}
        collisionPadding={16}     // ✅ auto-adjust position
  avoidCollisions={true} 
        className="p-0 border rounded-2xl shadow-xl bg-background z-[100]  border-black/10 
    ring-1 ring-black/5  w-full md:w-[680px] md:max-w-none max-w-[90vw] box-border"
        // stop outside click close
        onInteractOutside={(e) => {
          // if selecting end date, don't allow close
          if (selectingRef.current) e.preventDefault();
        }}
        // allow ESC only when not selecting
        onEscapeKeyDown={(e) => {
          if (selectingRef.current) e.preventDefault();
          else setOpen(false);
        }}
        // stop focus ring jump
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {calendarUI}
      </PopoverContent>
    </Popover>
  );
}

/* ===============================
   DATE BOX
================================ */
function DateBox({ label, value }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <span className="text-[11px] uppercase text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-2 text-sm font-medium">
        <CalendarDays size={14} className="text-muted-foreground" />
        {value ? format(value, "dd MMM yyyy") : "Add date"}
      </span>
    </div>
  );
}
