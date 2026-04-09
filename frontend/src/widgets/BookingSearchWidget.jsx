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

import {
  Search,
  Users,
  Minus,
  Plus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { toast } from "sonner";

import {
  toDateOnly,
  toDateOnlyFromAPI,
  toDateOnlyFromAPIUTC,
  todayDateOnly,
} from "../lib/date";

function minusOneDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

function mergeRanges(ranges) {
  if (!ranges?.length) return [];

  const sorted = ranges
    .map((r) => ({
      from: new Date(r.from),
      to: new Date(r.to),
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

export default function BookingSearchWidget() {
  const [disabledAll, setDisabledAll] = useState([]);

  const [range, setRange] = useState();
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);

  const [month, setMonth] = useState(new Date());

  const [isRangeInvalid, setIsRangeInvalid] = useState(false);

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
        console.error(err);
      }
    })();
  }, []);

  const handleRangeSelect = (newRange) => {
    setRange(newRange);

    if (!newRange?.from || !newRange?.to) {
      setIsRangeInvalid(false);
      return;
    }

    const conflict = rangeHasConflict(newRange, disabledAll);

    setIsRangeInvalid(conflict);
  };

  const onSearch = () => {
    if (!range?.from || !range?.to || totalGuests <= 0) {
      toast.error("Please select dates and guests");
      return;
    }

    if (isRangeInvalid) {
      toast.error("Unavailable dates selected.");
      return;
    }

    const checkIn = range.from.toISOString().split("T")[0];
    const checkOut = range.to.toISOString().split("T")[0];

    window.location.href =
      `https://booking.villagulposh.com/?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`;
  };

  const resetFilters = () => {
    setRange(undefined);
    setAdults(0);
    setChildren(0);
  };

  const GuestCounterInline = ({
    label,
    description,
    value,
    min = 0,
    max,
    onChange,
  }) => {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => value > min && onChange(value - 1)}
            className="h-8 w-8 rounded-full border flex items-center justify-center"
          >
            <Minus size={14} />
          </button>

          <span>{value}</span>

          <button
            onClick={() => value < max && onChange(value + 1)}
            className="h-8 w-8 rounded-full border flex items-center justify-center"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-4">
      <div className="w-full max-w-6xl mx-auto rounded-3xl bg-white/10 backdrop-blur-sm p-4">

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.3fr_1fr_auto_auto]">

          {/* CALENDAR */}
          <div>
            <div className="text-[10px] tracking-widest uppercase text-white font-semibold">
              CHECK IN / CHECK OUT
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="grid w-full grid-cols-2 rounded-xl py-[2px] h-14 mt-2"
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] uppercase">Check In</span>
                    <span className="flex items-center gap-2 text-sm">
                      <CalendarDays size={14} />
                      {range?.from ? format(range.from, "dd MMM yyyy") : "Add date"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[11px] uppercase">Check Out</span>
                    <span className="flex items-center gap-2 text-sm">
                      <CalendarDays size={14} />
                      {range?.to ? format(range.to, "dd MMM yyyy") : "Add date"}
                    </span>
                  </div>
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[680px] p-4">

                <div className="flex justify-between mb-4">
                  <button onClick={() => setMonth(subMonths(month, 1))}>
                    <ChevronLeft />
                  </button>

                  <button onClick={() => setMonth(addMonths(month, 1))}>
                    <ChevronRight />
                  </button>
                </div>

                <Calendar
                  mode="range"
                  month={month}
                  onMonthChange={setMonth}
                  numberOfMonths={2}
                  selected={range}
                  onSelect={handleRangeSelect}
                  disabled={[
                    { before: todayDateOnly() }
                  ]}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* GUESTS */}
          <div>
            <div className="text-[10px] tracking-widest uppercase text-white font-semibold">
              GUESTS
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="mt-2 h-14 w-full justify-between rounded-xl bg-white"
                >
                  {totalGuests > 0
                    ? `${totalGuests} Guests`
                    : "Select Guests"}

                  <Users size={18} />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[350px] p-4 rounded-2xl">
                <GuestCounterInline
                  label="Adults"
                  description="Ages 13+"
                  value={adults}
                  max={20}
                  onChange={setAdults}
                />

                <GuestCounterInline
                  label="Children"
                  description="Ages 2–12"
                  value={children}
                  max={20}
                  onChange={setChildren}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* SEARCH */}
          <Button
            onClick={onSearch}
            className="h-14 rounded-xl bg-[#941b2b]"
          >
            Check Availability
            <Search className="ml-2 h-4 w-4" />
          </Button>

          {/* RESET */}
          <Button
            variant="outline"
            onClick={resetFilters}
            className="h-14 rounded-xl bg-white"
          >
            Reset
          </Button>

        </div>
      </div>
    </div>
  );
}