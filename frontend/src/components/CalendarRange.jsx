import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/http";
import { format, addMonths, subMonths } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toDateOnlyFromAPIUTC, todayDateOnly } from "../lib/date";


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


export default function CalendarRange({
  roomId,
  value,
  onChange,
  disabledRanges,
  inline = false,
}) {
  const monthRefs = useRef([]);
  const [roomRanges, setRoomRanges] = useState([]);
  const [globalRanges, setGlobalRanges] = useState([]);
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const [month, setMonth] = useState(new Date());

  const [slideDir, setSlideDir] = useState(null);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const SWIPE_THRESHOLD = 50;

  const selectingRef = useRef(false);

  const INITIAL_MOBILE_MONTHS = 3;
  const [mobileMonths, setMobileMonths] = useState(() => {
    const base = new Date();
    return Array.from({ length: INITIAL_MOBILE_MONTHS }, (_, i) =>
      addMonths(base, i)
    );
  });

  const loadMoreMonths = () => {
    setMobileMonths((prev) => {
      const lastMonth = prev[prev.length - 1];

      const firstNewMonthIndex = prev.length;

      const newMonths = [
        addMonths(lastMonth, 1),
        addMonths(lastMonth, 2),
      ];

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = monthRefs.current[firstNewMonthIndex];
          if (el) {
            el.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        });
      });

      return [...prev, ...newMonths];
    });
  };

  const isSameDay = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isInsideRange = (date, range) => {
    if (!range?.from || !range?.to) return false;
    return date > range.from && date < range.to;
  };

  const handleSelect = (range) => {
    const clicked = range?.from ? new Date(range.from) : null;

    if (!clicked) {
      onChange(undefined);
      return;
    }

    if (value?.from && isSameDay(clicked, value.from)) {
      selectingRef.current = false;
      onChange(undefined);
      return;
    }

    if (value?.to && isSameDay(clicked, value.to)) {
      selectingRef.current = false;
      onChange(undefined);
      return;
    }

    if (isInsideRange(clicked, value)) {
      selectingRef.current = false;
      onChange(undefined);
      return;
    }


    if (!value?.from || (value?.from && value?.to)) {
      selectingRef.current = true;
      onChange({ from: clicked, to: undefined });
      setOpen(true);
      return;
    }

    if (value?.from && !value?.to) {
      const checkIn = new Date(value.from);

      if (clicked <= checkIn) {
        onChange({ from: clicked, to: undefined });
        return;
      }

      selectingRef.current = false;
      onChange({ from: checkIn, to: clicked });

      setTimeout(() => setOpen(false), 150);
    }
  };





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
  };

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

  useEffect(() => {
    if (!open) selectingRef.current = false;
  }, [open]);

  const disabled = useMemo(() => {
    const base = [
      { before: todayDateOnly() },
      ...globalRanges,
      ...roomRanges,
      ...(disabledRanges || []),
    ];
    if (value?.from && !value?.to) {
      base.push({ before: todayDateOnly() });
    }
    return base;
  }, [globalRanges, roomRanges, disabledRanges, value?.from, value?.to]);



  const calendarUI = (
    <div className="calendar-wrapper">
      {/* ✅ KEEP YOUR NAV BUTTONS EXACTLY */}
      <button
        className="calendar-nav left"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (!isDesktop) {
            return;
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
            return;
          } else {
            setMonth((m) => addMonths(m, 1));
          }
        }}
      >
        <ChevronRight size={20} />
      </button>

      {isDesktop ? (
        <div
          className="calendar-viewport"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <Calendar
            mode="range"
            month={month}
            onMonthChange={(newMonth) => {
              if (!isDesktop && selectingRef.current) return;
              setMonth(newMonth);
            }}
            numberOfMonths={2}
            selected={value}
            onSelect={handleSelect}
            disabled={disabled}
            showOutsideDays={false}
            className="airbnb-calendar p-4"
            classNames={{
              months: "flex gap-8",
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
      ) : (
        <div
          className="mobile-calendar-scroll"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {mobileMonths.map((m, idx) => (
            <div
              key={idx}
              ref={(el) => (monthRefs.current[idx] = el)}
            >
              <Calendar
                key={idx}
                mode="range"
                month={m}
                numberOfMonths={1}
                selected={value}
                onSelect={handleSelect}
                disabled={disabled}
                showOutsideDays={false}
                className="airbnb-calendar mobile-airbnb"
                classNames={{
                  months: "flex justify-center",
                  caption: "flex justify-center font-medium mb-3",
                  table: "w-full border-collapse",
                  head_row: "grid grid-cols-7",
                  row: "grid grid-cols-7",
                  cell: "h-10 w-10 text-center",
                  day: "h-10 w-10 rounded-full outline-none",
                  day_button: "h-10 w-10 rounded-full outline-none",
                  day_range_start: "bg-red-700 text-white",
                  day_range_end: "bg-red-700 text-white",
                  day_selected: "bg-red-700 text-white",
                  day_range_middle: "bg-red-100 text-red-900",
                  day_today: "border border-red-700",
                  day_disabled: "opacity-40",
                }}
              />
            </div>
          ))}

          {/* ✅ button after months (NOT sticky) */}
          <div className="pt-2 pb-2">
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={loadMoreMonths}
            >
              Load more dates
            </Button>
          </div>
        </div>
      )}
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
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && selectingRef.current) return;
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-14 grid grid-cols-2 rounded-xl"
        >
          <DateBox label="Check in" value={value?.from} />
          <DateBox label="Check out" value={value?.to} />
        </Button>
      </PopoverTrigger>

      {/* ✅ DESKTOP width same, MOBILE becomes square fixed */}
      <PopoverContent className="calendar-popover p-0 w-full md:w-[680px]">
        {calendarUI}
      </PopoverContent>
    </Popover>
  );
}


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