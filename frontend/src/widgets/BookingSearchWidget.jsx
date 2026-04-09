import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/http";
import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  subMonths,
  isBefore,
  isAfter,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  toDateOnly,
  toDateOnlyFromAPI,
  toDateOnlyFromAPIUTC,
  todayDateOnly,
} from "../lib/date";

/* ----------------------------- helpers ----------------------------- */

function minusOneDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

function mergeRanges(ranges) {
  if (!ranges || !ranges.length) return [];

  const sorted = ranges
    .map((r) => ({
      from: toDateOnly(r.from),
      to: toDateOnly(r.to),
    }))
    .sort((a, b) => a.from - b.from);

  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];

    if (cur.from <= last.to) {
      if (cur.to > last.to) last.to = cur.to;
    } else {
      out.push(cur);
    }
  }
  return out;
}

function rangeHasConflict(selected, blockedRanges) {
  if (!selected?.from || !selected?.to) return false;
  const start = toDateOnly(selected.from);
  const end = toDateOnly(selected.to);

  return blockedRanges.some((b) => {
    const bStart = toDateOnly(b.from);
    const bEnd = toDateOnly(b.to);
    return start < bEnd && end > bStart;
  });
}

function dateKey(date) {
  return toDateOnly(date).toDateString();
}

function isBetween(date, start, end) {
  return isAfter(date, start) && isBefore(date, end);
}

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

/* ----------------------------- component ----------------------------- */

export default function BookingSearchWidget() {
  const isDesktop = useIsDesktop();

  const [disabledAll, setDisabledAll] = useState([]);
  const [range, setRange] = useState();
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [isRangeInvalid, setIsRangeInvalid] = useState(false);

  const [showCalendar, setShowCalendar] = useState(false);
  const [showGuests, setShowGuests] = useState(false);

  const [month, setMonth] = useState(new Date());

  const calendarRef = useRef(null);
  const guestRef = useRef(null);
  const dateTriggerRef = useRef(null);
  const guestTriggerRef = useRef(null);

  const totalGuests = adults + children;

  useEffect(() => {
    (async () => {
      try {
        const [bookingsRes, blackoutsRes] = await Promise.all([
          api.get("/rooms/disabled/all"),
          api.get("/blackouts"),
        ]);

        const bookings = (bookingsRes.data || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from || b.startDate),
          to: minusOneDay(toDateOnlyFromAPIUTC(b.to || b.endDate)),
        }));

        const blackouts = (blackoutsRes.data || []).map((b) => ({
          from: toDateOnlyFromAPI(b.from),
          to: toDateOnlyFromAPI(b.to),
        }));

        setDisabledAll(mergeRanges([...bookings, ...blackouts]));
      } catch (err) {
        console.error("failed to load disabled ranges", err);
      }
    })();
  }, []);

  useEffect(() => {
  const onDocClick = (e) => {
    const path = e.composedPath();

    if (
      showCalendar &&
      !path.includes(calendarRef.current) &&
      !path.includes(dateTriggerRef.current)
    ) {
      setShowCalendar(false);
    }

    if (
      showGuests &&
      !path.includes(guestRef.current) &&
      !path.includes(guestTriggerRef.current)
    ) {
      setShowGuests(false);
    }
  };

  window.addEventListener("mousedown", onDocClick);

  return () => {
    window.removeEventListener("mousedown", onDocClick);
  };
}, [showCalendar, showGuests]);

  const blockedNights = useMemo(() => {
    const nights = new Set();
    disabledAll.forEach((r) => {
      let d = new Date(r.from);
      const end = new Date(r.to);
      while (d <= end) {
        nights.add(dateKey(d));
        d.setDate(d.getDate() + 1);
      }
    });
    return nights;
  }, [disabledAll]);

  const isDisabledForCheckIn = (date) => {
    const today = todayDateOnly();
    return isBefore(toDateOnly(date), today) || blockedNights.has(dateKey(date));
  };

  const isDisabledForCheckOut = (date, checkIn) => {
    const current = toDateOnly(date);
    const inDate = toDateOnly(checkIn);

    if (current <= inDate) return true;

    let d = addDays(inDate, 1);
    while (d < current) {
      if (blockedNights.has(dateKey(d))) return true;
      d = addDays(d, 1);
    }

    return false;
  };

  const handleDaySelect = (day) => {
    const clicked = toDateOnly(day);

    if (!range?.from || (range?.from && range?.to)) {
      if (isDisabledForCheckIn(clicked)) return;

      setRange({ from: clicked, to: undefined });
      setIsRangeInvalid(false);
      return;
    }

    if (range?.from && !range?.to) {
      if (isDisabledForCheckOut(clicked, range.from)) return;

      const newRange = {
        from: toDateOnly(range.from),
        to: clicked,
      };

      const conflict = rangeHasConflict(newRange, disabledAll);

      if (conflict) {
        setIsRangeInvalid(true);
        toast.error("Some selected dates are already booked. Please adjust your stay.");
        return;
      }

      setRange(newRange);
      setIsRangeInvalid(false);
      setShowCalendar(false);
    }
  };

  const onSearch = () => {
    const hasValidRange = !!(range?.from && range?.to);
    const hasGuests = totalGuests > 0;

    if (!hasValidRange || !hasGuests) {
      toast.error("Please select dates and guests");
      return;
    }

    if (isRangeInvalid) {
      toast.error("Your selected stay includes unavailable dates. Please adjust the dates.");
      return;
    }

    const checkIn = format(range.from, "yyyy-MM-dd");
    const checkOut = format(range.to, "yyyy-MM-dd");

    window.location.href = `https://booking.villagulposh.com/?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&scrollToResults=1`;
  };

  const resetFilters = () => {
    setRange(undefined);
    setAdults(0);
    setChildren(0);
    setIsRangeInvalid(false);
    setShowCalendar(false);
    setShowGuests(false);
  };

  const changeAdults = (next) => {
    if (next < 0 || next > 20) return;
    setAdults(next);
  };

  const changeChildren = (next) => {
    if (next < 0 || next > 20 - adults) return;
    setChildren(next);
  };

  return (
    <div className="w-full px-4">
      <div className="mx-auto w-full max-w-6xl rounded-3xl bg-white/10 p-4 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.6)] backdrop-blur-sm ring-1 ring-black/5">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.3fr_1fr_auto_auto] md:items-end">
          {/* Dates */}
          <div className="relative">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white">
              CHECK IN / CHECK OUT
            </div>

            <button
              type="button"
              ref={dateTriggerRef}
              onClick={() => {
                setShowGuests(false);
                setShowCalendar((v) => !v);
              }}
              className="mt-2 grid h-14 w-full grid-cols-2 rounded-xl bg-white px-5 text-left shadow-sm"
            >
              <DateBoxInline
                label="CHECK IN"
                value={range?.from}
              />
              <DateBoxInline
                label="CHECK OUT"
                value={range?.to}
              />
            </button>

            {showCalendar && (
              <div
                ref={calendarRef}
                className="absolute left-0 top-[calc(100%+10px)] z-[9999] w-[min(680px,95vw)] rounded-2xl bg-white p-4 shadow-[0_30px_80px_-25px_rgba(0,0,0,0.25)]"
              >
                <div className="hidden md:block">
                  <div className="flex items-start gap-8">
                    <MonthPanel
                      month={month}
                      range={range}
                      blockedNights={blockedNights}
                      onDaySelect={handleDaySelect}
                      isDisabledForCheckIn={isDisabledForCheckIn}
                      isDisabledForCheckOut={isDisabledForCheckOut}
                      onPrev={() => setMonth((m) => subMonths(m, 1))}
                      showPrev
                    />

                    <MonthPanel
                      month={addMonths(month, 1)}
                      range={range}
                      blockedNights={blockedNights}
                      onDaySelect={handleDaySelect}
                      isDisabledForCheckIn={isDisabledForCheckIn}
                      isDisabledForCheckOut={isDisabledForCheckOut}
                      onNext={() => setMonth((m) => addMonths(m, 1))}
                      showNext
                    />
                  </div>
                </div>

                <div className="md:hidden">
                  <MonthPanel
                    month={month}
                    range={range}
                    blockedNights={blockedNights}
                    onDaySelect={handleDaySelect}
                    isDisabledForCheckIn={isDisabledForCheckIn}
                    isDisabledForCheckOut={isDisabledForCheckOut}
                    onPrev={() => setMonth((m) => subMonths(m, 1))}
                    onNext={() => setMonth((m) => addMonths(m, 1))}
                    showPrev
                    showNext
                  />
                </div>
              </div>
            )}
          </div>

          {/* Guests */}
          <div className="relative">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white">
              GUESTS
            </div>

            <button
              type="button"
              ref={guestTriggerRef}
              onClick={() => {
                setShowCalendar(false);
                setShowGuests((v) => !v);
              }}
              className="mt-2 flex h-14 w-full items-center justify-between rounded-xl bg-white px-5 text-left shadow-sm"
            >
              <span className="text-[15px] text-[#2A201B]">
                {totalGuests > 0
                  ? `${totalGuests} guest${totalGuests > 1 ? "s" : ""}`
                  : "Select guests"}
              </span>
              <Users className="h-4 w-4 text-[#a11d2e]" />
            </button>

            {showGuests && (
              <div
                ref={guestRef}
                className="absolute left-0 top-[calc(100%+10px)] z-[9999] w-[350px] max-w-[95vw] rounded-3xl bg-white p-4 shadow-[0_30px_80px_-25px_rgba(0,0,0,0.25)]"
              >
                <GuestRow
                  label="Adults"
                  description="Ages 13 or above"
                  value={adults}
                  onMinus={() => changeAdults(adults - 1)}
                  onPlus={() => changeAdults(adults + 1)}
                  minusDisabled={adults <= 0}
                  plusDisabled={adults >= 20}
                />

                <div className="my-4 h-px bg-[#e7ddd7]" />

                <GuestRow
                  label="Children"
                  description="Ages 2–12"
                  value={children}
                  onMinus={() => changeChildren(children - 1)}
                  onPlus={() => changeChildren(children + 1)}
                  minusDisabled={children <= 0}
                  plusDisabled={children >= 20 - adults}
                />

                <div className="my-4 h-px bg-[#e7ddd7]" />

                <div className="rounded-2xl border border-[#eadfd8] bg-[#fff8f5] p-3">
                  <div className="text-[12px] leading-snug text-[#5c4b42]">
                    Planning a stay for more than <strong>10 guests</strong>?
                    <br />
                    For large groups, we recommend reserving the <strong>Entire Gulposh Villa</strong> for better comfort and privacy.
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (range?.from) params.set("checkIn", format(range.from, "yyyy-MM-dd"));
                      if (range?.to) params.set("checkOut", format(range.to, "yyyy-MM-dd"));
                      params.set("adults", String(adults));
                      params.set("children", String(children));
                      window.location.href = `https://booking.villagulposh.com/entire-villa-form?${params.toString()}`;
                    }}
                    className="mt-3 h-10 w-full rounded-[10px] bg-[#a11d2e] text-[12px] font-medium text-white transition hover:bg-[#8e1827]"
                  >
                    Enquire Entire Villa
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <button
            type="button"
            onClick={onSearch}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#941b2b] px-7 text-white shadow-lg shadow-[#a11d2e]/20 transition hover:bg-[#8e1827] md:w-auto"
          >
            Check Availability
            <Search className="h-4 w-4" />
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={resetFilters}
            className="h-14 w-full rounded-xl bg-white px-6 text-black transition hover:bg-[#f6f3f0] md:w-auto"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- subcomponents ----------------------------- */

function DateBoxInline({ label, value }) {
  return (
    <div className="flex min-h-[52px] flex-col items-center justify-center">
      <span className="text-[11px] uppercase text-[#2A201B]">{label}</span>
      <span className="mt-1 flex items-center gap-2 text-sm text-[#2A201B]">
        <CalendarDays size={14} />
        {value ? format(value, "dd MMM yyyy") : "Add date"}
      </span>
    </div>
  );
}

function GuestRow({
  label,
  description,
  value,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-[16px] font-medium text-[#2A201B]">{label}</p>
        <p className="text-sm text-[#8a8079]">{description}</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMinus}
          disabled={minusDisabled}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e6e1dd] text-[#6f655e] disabled:opacity-35"
        >
          <Minus size={14} />
        </button>

        <span className="w-4 text-center text-[18px] text-[#2A201B]">
          {value}
        </span>

        <button
          type="button"
          onClick={onPlus}
          disabled={plusDisabled}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e6e1dd] text-[#6f655e] disabled:opacity-35"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function MonthPanel({
  month,
  range,
  blockedNights,
  onDaySelect,
  isDisabledForCheckIn,
  isDisabledForCheckOut,
  onPrev,
  onNext,
  showPrev = false,
  showNext = false,
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const current = day;
      const inCurrentMonth = isSameMonth(current, month);

      const disabled = range?.from && !range?.to
        ? isDisabledForCheckOut(current, range.from)
        : isDisabledForCheckIn(current);

      const isStart = range?.from && isSameDay(current, range.from);
      const isEnd = range?.to && isSameDay(current, range.to);
      const inMiddle = range?.from && range?.to && isBetween(current, range.from, range.to);
      const blocked = blockedNights.has(dateKey(current));
      const today = isSameDay(current, todayDateOnly());

      days.push(
        <button
          type="button"
          key={current.toISOString()}
          onClick={() => inCurrentMonth && !disabled && onDaySelect(current)}
          disabled={!inCurrentMonth || disabled}
          className={[
            "relative h-10 w-10 rounded-full text-sm transition",
            !inCurrentMonth ? "text-transparent" : "",
            disabled && inCurrentMonth ? "cursor-not-allowed text-[#d7d2cd]" : "",
            !disabled && inCurrentMonth ? "text-[#2A201B] hover:bg-[#f6f2ef]" : "",
            today && !isStart && !isEnd ? "border border-[#a11d2e]" : "",
            inMiddle ? "rounded-none bg-[#f8e7ea] text-[#7d1d2d]" : "",
            isStart || isEnd ? "bg-[#a11d2e] text-white hover:bg-[#a11d2e]" : "",
            blocked && !isStart && !isEnd && inCurrentMonth ? "opacity-40" : "",
          ].join(" ")}
        >
          {format(current, "d")}
        </button>
      );

      day = addDays(day, 1);
    }

    rows.push(
      <div key={day.toISOString()} className="grid grid-cols-7 gap-y-1">
        {days}
      </div>
    );
    days = [];
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          className={showPrev ? "text-[#2A201B]" : "invisible"}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-[16px] font-medium text-[#2A201B]">
          {format(month, "MMMM yyyy")}
        </div>

        <button
          type="button"
          onClick={onNext}
          className={showNext ? "text-[#2A201B]" : "invisible"}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mb-3 grid grid-cols-7 text-center text-sm text-[#7b6f68]">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="space-y-1">{rows}</div>
    </div>
  );
}