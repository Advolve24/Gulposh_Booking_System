import { useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import { format, addMonths, subMonths } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
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
  const isDesktop = useIsDesktop();

  /* 🔹 Control visible month manually */
  const [month, setMonth] = useState(new Date());

  /* -------- LOAD DISABLED RANGES -------- */

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

  /* ===============================
     CALENDAR UI
  ============================== */

  const calendarUI = (
    <div className="calendar-wrapper">
      {/* 🔹 OUTSIDE NAV */}
      <button
        className="calendar-nav left"
        onClick={() => setMonth((m) => subMonths(m, 1))}
      >
        <ChevronLeft size={20} />
      </button>

      <button
        className="calendar-nav right"
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
        onSelect={onChange}
        disabled={disabled}
        showOutsideDays={false}
        className="airbnb-calendar p-4"
        classNames={{
          months: isDesktop ? "flex gap-8" : "flex justify-center",
          caption: "hidden", // ⛔ disable internal nav
          table: "w-full border-collapse",
          head_row: "grid grid-cols-7",
          row: "grid grid-cols-7",
          cell: "h-9 w-9 text-center",
          day: "h-9 w-9 rounded-full",

          day_range_start: "range-start",
          day_range_end: "range-end",
          day_range_middle: "range-middle",
          day_selected: "range-selected",

          day_today: "border border-primary",
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
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="
              w-full
              h-14
              grid grid-cols-2
              rounded-xl
              px-4
              bg-white
              border
              text-center
              divide-x-2
              divide-muted-black
            "
        >
          <DateBox label="Check in" value={value?.from} />
          <DateBox label="Check out" value={value?.to} />
        </Button>
      </PopoverTrigger>


      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={12}
        className="p-0 border rounded-2xl shadow-xl bg-background z-[100] "
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
      <span className="text-[11px] uppercase text-muted-foreground ">
        {label}
      </span>

      <span className="flex items-center gap-2 text-sm font-medium ">
        <CalendarDays size={14} className="text-muted-foreground" />
        {value ? format(value, "dd MMM yyyy") : "Add date"}
      </span>
    </div>
  );
}
