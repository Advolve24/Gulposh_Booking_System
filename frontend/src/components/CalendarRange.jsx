import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/http";
import { format, addMonths, subMonths } from "date-fns";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
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


const minusOneDay = (d) => {
  const t = new Date(d);
  t.setDate(t.getDate() - 1);
  return t;
};


export default function CalendarRange({
  roomId,
  value,
  onChange,
  disabledRanges,
  inline = false,
  showWeekdayInBox = false,
  pricing,
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
  const lastClickedDayRef = useRef(null);

  const INITIAL_MOBILE_MONTHS = 3;
  const [mobileMonths, setMobileMonths] = useState(() => {
    const base = new Date();
    return Array.from({ length: INITIAL_MOBILE_MONTHS }, (_, i) =>
      addMonths(base, i)
    );
  });

  const blockedNights = useMemo(() => {
  const ranges = [...globalRanges, ...roomRanges, ...(disabledRanges || [])];
  const nights = new Set();
  ranges.forEach(r => {
    let d = new Date(r.from);
    const end = new Date(r.to);
    while (d <= end) {
      nights.add(d.toDateString());
      d.setDate(d.getDate() + 1);
    }
  });
  return nights;
}, [globalRanges, roomRanges, disabledRanges]);



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

  const handleSelect = (range) => {
    const clickedFrom = range?.from ? new Date(range.from) : null;
    const clickedTo = range?.to ? new Date(range.to) : null;
    const directClickedDay = lastClickedDayRef.current
      ? new Date(lastClickedDayRef.current)
      : null;

    if (!clickedFrom) {
      lastClickedDayRef.current = null;
      onChange(undefined);
      return;
    }
    if (!value?.from || (value?.from && value?.to)) {
      let nextCheckIn = clickedFrom;

      if (value?.from && value?.to) {
        const currentFrom = new Date(value.from);
        const currentTo = new Date(value.to);

        if (directClickedDay) {
          nextCheckIn = directClickedDay;
        } else if (
          clickedFrom &&
          clickedTo &&
          clickedFrom.getTime() === currentFrom.getTime() &&
          clickedTo.getTime() !== currentTo.getTime()
        ) {
          nextCheckIn = clickedTo;
        } else if (
          clickedFrom &&
          clickedTo &&
          clickedTo.getTime() === currentTo.getTime() &&
          clickedFrom.getTime() !== currentFrom.getTime()
        ) {
          nextCheckIn = clickedFrom;
        }
      }

      lastClickedDayRef.current = null;

      if (
        nextCheckIn < todayDateOnly() ||
        blockedNights.has(nextCheckIn.toDateString())
      ) {
        return;
      }

      selectingRef.current = true;
      onChange({ from: nextCheckIn, to: undefined });
      setOpen(true);
      return;
    }
    if (value?.from && !value?.to) {
      const checkIn = new Date(value.from);
      const attemptedCheckout = clickedTo || clickedFrom;
      const isEarlierCheckInReplacement =
        clickedFrom &&
        clickedTo &&
        clickedFrom < checkIn &&
        clickedTo.getTime() === checkIn.getTime();

      if (isEarlierCheckInReplacement) {
        if (
          clickedFrom < todayDateOnly() ||
          blockedNights.has(clickedFrom.toDateString())
        ) {
          return;
        }

        selectingRef.current = true;
        lastClickedDayRef.current = null;
        onChange({ from: clickedFrom, to: undefined });
        setOpen(true);
        return;
      }

      if (attemptedCheckout < checkIn) {
        if (
          attemptedCheckout < todayDateOnly() ||
          blockedNights.has(attemptedCheckout.toDateString())
        ) {
          return;
        }

        selectingRef.current = true;
        lastClickedDayRef.current = null;
        onChange({ from: attemptedCheckout, to: undefined });
        setOpen(true);
        return;
      }

      if (attemptedCheckout.getTime() === checkIn.getTime()) {
        return;
      }

      selectingRef.current = false;
      lastClickedDayRef.current = null;
      onChange({ from: checkIn, to: attemptedCheckout });

      setTimeout(() => setOpen(false), 150);
    }
  };



  const handleDayClick = (day) => {
    const clicked = new Date(day);

    if (value?.from && value?.to) {
      const currentFrom = new Date(value.from);
      const currentTo = new Date(value.to);

      if (
        clicked.toDateString() !== currentFrom.toDateString() &&
        clicked.toDateString() !== currentTo.toDateString() &&
        clicked >= todayDateOnly() &&
        !blockedNights.has(clicked.toDateString())
      ) {
        lastClickedDayRef.current = clicked;
      } else {
        lastClickedDayRef.current = null;
      }
    } else {
      lastClickedDayRef.current = null;
    }

    if (!value?.from) return;
    if (value?.from &&
      clicked.toDateString() === new Date(value.from).toDateString()) {
      onChange(undefined);
      return;
    }
    if (value?.to &&
      clicked.toDateString() === new Date(value.to).toDateString()) {
      onChange(undefined);
      return;
    }
    if (value?.from && value?.to) {
      if (clicked > value.from && clicked < value.to) {
        onChange(undefined);
      }
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
            to: minusOneDay(toDateOnlyFromAPIUTC(b.endDate)),
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
    const today = todayDateOnly();
    if (!value?.from || (value?.from && value?.to)) {
      return [
        { before: today },
        (date) => blockedNights.has(date.toDateString())
      ];
    }
    const checkIn = new Date(value.from);
    return [
      { before: today },
      (date) => {
        if (date <= checkIn) {
          return blockedNights.has(date.toDateString());
        }

        let d = new Date(checkIn);
        d.setDate(d.getDate() + 1);
        while (d < date) {
          if (blockedNights.has(d.toDateString())) return true;
          d.setDate(d.getDate() + 1);
        }
        return false;
      }
    ];
  }, [blockedNights, value?.from]);

  const dayPriceFormatter = useMemo(() => {
    const weekdayPrice = Number(pricing?.weekdayPrice || 0);
    const weekendPrice = Number(pricing?.weekendPrice || pricing?.weekdayPrice || 0);

    if (!weekdayPrice && !weekendPrice) return null;

    return (date) => {
      const day = date.getDay();
      const amount = day === 5 || day === 6 || day === 0 ? weekendPrice : weekdayPrice;

      if (!amount) return null;
      if (amount >= 1000) {
        return `₹ ${(amount / 1000).toFixed(1)}k`;
      }

      return `₹ ${amount}`;
    };
  }, [pricing?.weekdayPrice, pricing?.weekendPrice]);

  const CalendarPriceDayButton = ({ day, modifiers, children, className, ...props }) => {
    const isWeekendDay = [0, 5, 6].includes(day.date.getDay());
    const isSelectedEdge =
      modifiers.range_start ||
      modifiers.range_end ||
      (modifiers.selected && !modifiers.range_middle);
    const priceLabel =
      !modifiers.hidden && !modifiers.outside && !modifiers.disabled && dayPriceFormatter
        ? dayPriceFormatter(day.date)
        : null;

    return (
      <CalendarDayButton
        day={day}
        modifiers={modifiers}
        className={className}
        {...props}
      >
        <span className="!text-[16px] font-medium leading-none">{children}</span>
        {priceLabel ? (
          <span
            className={`!text-[10px] leading-none opacity-90 ${
              !isWeekendDay && isSelectedEdge
                ? "text-white"
                : isWeekendDay
                  ? "text-orange-500"
                  : "text-green-600"
            }`}
          >
            {priceLabel}
          </span>
        ) : null}
      </CalendarDayButton>
    );
  };



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
            numberOfMonths={1}
            selected={value || undefined}
            onSelect={handleSelect}
            onDayClick={handleDayClick}
            disabled={disabled}
            showOutsideDays={false}
            className="airbnb-calendar p-4"
            classNames={{
              months: "flex gap-8",
              caption: "hidden",
              table: "w-full border-collapse",
              head_row: "grid grid-cols-7",
              row: "grid grid-cols-7",
              cell: `${dayPriceFormatter ? "h-12 w-12" : "h-9 w-9"} text-center`,
              day: `${dayPriceFormatter ? "h-12 w-12" : "h-9 w-9"} rounded-md outline-none`,
              day_button: `${dayPriceFormatter ? "h-12 w-12" : "h-9 w-9"} rounded-md outline-none`,
              day_range_start: "bg-red-700 text-white",
              day_range_end: "bg-red-700 text-white",
              day_selected: "bg-red-700 text-white",
              day_range_middle: "bg-red-100 text-red-900",
              day_today: "border border-red-700",
              day_disabled: "opacity-40",
            }}
            components={dayPriceFormatter ? { DayButton: CalendarPriceDayButton } : undefined}
          />
        </div>
      ) : (
        <div
          className="mobile-calendar-scroll"
          data-vaul-no-drag=""
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
                onDayClick={handleDayClick}
                disabled={disabled}
                showOutsideDays={false}
                className="airbnb-calendar mobile-airbnb"
                classNames={{
                  months: "flex justify-center",
                  caption: "flex justify-center font-medium mb-3",
                  table: "w-full border-collapse",
                  head_row: "grid grid-cols-7",
                  row: "grid grid-cols-7",
                  cell: `${dayPriceFormatter ? "h-12 w-12" : "h-10 w-10"} text-center`,
                  day: `${dayPriceFormatter ? "h-12 w-12" : "h-10 w-10"} rounded-md outline-none`,
                  day_button: `${dayPriceFormatter ? "h-12 w-12" : "h-10 w-10"} rounded-md outline-none`,
                  day_range_start: "bg-red-700 text-white",
                  day_range_end: "bg-red-700 text-white",
                  day_selected: "bg-red-700 text-white",
                  day_range_middle: "bg-red-100 text-red-900",
                  day_today: "border border-red-700",
                  day_disabled: "opacity-40",
                }}
                components={dayPriceFormatter ? { DayButton: CalendarPriceDayButton } : undefined}
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
          <DateBox
            label="Check in"
            value={value?.from}
            showWeekday={showWeekdayInBox}
          />
          <DateBox
            label="Check out"
            value={value?.to}
            showWeekday={showWeekdayInBox}
          />
        </div>
        <div className="border rounded-xl bg-card overflow-hidden">{calendarUI}</div>
      </div>
    );
  }

  /* POPOVER MODE */
  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="grid w-full grid-cols-2 rounded-xl py-[2px] h-auto"
        >
          <DateBox
            label="Check in"
            value={value?.from}
            showWeekday={showWeekdayInBox}
          />
          <DateBox
            label="Check out"
            value={value?.to}
            showWeekday={showWeekdayInBox}
          />
        </Button>
      </PopoverTrigger>

      {/* ✅ DESKTOP width same, MOBILE becomes square fixed */}
      <PopoverContent
        className="calendar-popover p-0 w-full md:w-[430px] overflow-hidden"
        data-vaul-no-drag=""
      >
        {calendarUI}
      </PopoverContent>
    </Popover>
  );
}


function DateBox({ label, value, showWeekday = false }) {
  return (
    <div className="flex min-h-[52px] flex-col items-center justify-center">
      <span className="text-[11px] uppercase">{label}</span>
      <span className="flex items-center gap-2 text-sm">
        <CalendarDays size={14} />
        {value ? format(value, "dd MMM yyyy") : "Add date"}
      </span>
      {showWeekday && value && (
        <span className="text-[11px] text-muted-foreground">
          {format(value, "EEEE")}
        </span>
      )}
    </div>
  );
}
