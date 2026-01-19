import { useEffect, useMemo, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const [month, setMonth] = useState(new Date());

  /* 🔥 slide animation state */
  const [slideDir, setSlideDir] = useState(null); // "left" | "right" | null

  /* 🔥 swipe tracking */
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const SWIPE_THRESHOLD = 50;

  const selectingRef = useRef(false);

  /* ===============================
     HANDLE DATE SELECTION
  ============================== */
  const handleSelect = (range) => {
    if (!range) return;

    setOpen(true);
    onChange(range);

    const from = range?.from ? new Date(range.from) : null;
    const to = range?.to ? new Date(range.to) : null;

    if (from && (!to || from.getTime() === to.getTime())) {
      selectingRef.current = true;
      return;
    }

    if (from && to) {
      selectingRef.current = false;
      setTimeout(() => setOpen(false), 120);
    }
  };

  /* ===============================
     TOUCH HANDLERS (MOBILE ONLY)
  ============================== */
  const onTouchStart = (e) => {
    if (isDesktop || selectingRef.current) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchMove = (e) => {
    if (isDesktop || selectingRef.current) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const onTouchEnd = () => {
    if (isDesktop || selectingRef.current) return;

    const deltaX = touchStartX.current - touchEndX.current;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;

    // 👉 swipe left
    if (deltaX > 0) {
      setSlideDir("left");
      setTimeout(() => {
        setMonth((m) => addMonths(m, 1));
        setSlideDir(null);
      }, 260);
    }

    // 👈 swipe right
    if (deltaX < 0) {
      setSlideDir("right");
      setTimeout(() => {
        setMonth((m) => subMonths(m, 1));
        setSlideDir(null);
      }, 260);
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
      {/* NAV */}
      <button
        className="calendar-nav left"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (!isDesktop) {
            setSlideDir("right");
            setTimeout(() => {
              setMonth((m) => subMonths(m, 1));
              setSlideDir(null);
            }, 260);
          } else {
            setMonth((m) => subMonths(m, 1));
          }
        }}
      >
        <ChevronLeft size={20} />
      </button>

      <button
        className="calendar-nav right"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (!isDesktop) {
            setSlideDir("left");
            setTimeout(() => {
              setMonth((m) => addMonths(m, 1));
              setSlideDir(null);
            }, 260);
          } else {
            setMonth((m) => addMonths(m, 1));
          }
        }}
      >
        <ChevronRight size={20} />
      </button>

      {/* 🔥 SLIDING CALENDAR */}
      <div
        className={`calendar-slide ${
          slideDir === "left"
            ? "slide-left"
            : slideDir === "right"
            ? "slide-right"
            : ""
        }`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
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
            day: "h-9 w-9 rounded-full outline-none",
            day_button: "h-9 w-9 rounded-full outline-none",
            day_range_start: "bg-red-700 text-white",
            day_range_end: "bg-red-700 text-white",
            day_selected: "bg-red-700 text-white",
            day_range_middle: "bg-red-100 text-red-900",
            day_today: "border border-red-700",
            day_disabled: "opacity-40",
          }}
        />
      </div>
    </div>
  );

  /* INLINE MODE */
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

  /* POPOVER MODE */
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full h-14 grid grid-cols-2 rounded-xl">
          <DateBox label="Check in" value={value?.from} />
          <DateBox label="Check out" value={value?.to} />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0 w-full md:w-[680px]">
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
    <div className="flex flex-col items-center">
      <span className="text-[11px] uppercase">{label}</span>
      <span className="flex items-center gap-2 text-sm">
        <CalendarDays size={14} />
        {value ? format(value, "dd MMM yyyy") : "Add date"}
      </span>
    </div>
  );
}
