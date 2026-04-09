import { useEffect, useState } from "react";
import { api } from "../api/http";
import CalendarRange from "../components/CalendarRange";
import GuestCounter from "../components/GuestCounter";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

import { Search, Users } from "lucide-react";
import { toast } from "sonner";

import {
  toDateOnly,
  toDateOnlyFromAPI,
  toDateOnlyFromAPIUTC,
} from "../lib/date";

/* ================= HELPERS ================= */

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

/* ================= COMPONENT ================= */

export default function BookingSearchWidget() {
  const [disabledAll, setDisabledAll] = useState([]);

  const [range, setRange] = useState();
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);

  const [isRangeInvalid, setIsRangeInvalid] = useState(false);

  const totalGuests = adults + children;

  /* FETCH BLOCKED / BLACKOUT DATES */
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
        console.error("Failed loading disabled dates", err);
      }
    })();
  }, []);

  /* RANGE SELECT */
  const handleRangeSelect = (newRange) => {
    setRange(newRange);

    if (!newRange?.from || !newRange?.to) {
      setIsRangeInvalid(false);
      return;
    }

    const conflict = rangeHasConflict(newRange, disabledAll);

    if (conflict) {
      setIsRangeInvalid(true);

      toast.error(
        "Some selected dates are unavailable. Please adjust your stay."
      );
    } else {
      setIsRangeInvalid(false);
    }
  };

  /* SEARCH */
  const onSearch = () => {
    if (!range?.from || !range?.to || totalGuests <= 0) {
      toast.error("Please select dates and guests");
      return;
    }

    if (isRangeInvalid) {
      toast.error(
        "Selected stay includes unavailable dates."
      );
      return;
    }

    const checkIn =
      range.from.toISOString().split("T")[0];

    const checkOut =
      range.to.toISOString().split("T")[0];

    window.location.href =
      `https://booking.villagulposh.com/?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&scrollToResults=1`;
  };

  /* RESET */
  const resetFilters = () => {
    setRange(undefined);
    setAdults(0);
    setChildren(0);
    setIsRangeInvalid(false);
  };

  return (
    <div
      className="
        w-full max-w-6xl
        mx-auto
        rounded-3xl
        bg-white/10
        backdrop-blur-sm
        shadow-[0_30px_80px_-35px_rgba(0,0,0,0.6)]
        ring-1 ring-black/5
        p-4
      "
    >
      <div
        className="
          grid grid-cols-1
          gap-2
          md:grid-cols-[1.3fr_1fr_auto_auto]
          md:items-end
        "
      >
        {/* DATE PICKER */}
        <div>
          <div className="text-[10px] tracking-widest uppercase text-white font-semibold">
            CHECK IN / CHECK OUT
          </div>

          <div className="mt-2">
            <CalendarRange
              value={range}
              onChange={handleRangeSelect}
              disabledRanges={disabledAll}
              showWeekdayInBox
            />
          </div>
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
                className="
                  mt-2 h-14 w-full
                  justify-between
                  rounded-xl
                  bg-white
                  border-[#eadfd8]
                "
              >
                {totalGuests > 0
                  ? `${totalGuests} Guest${totalGuests > 1 ? "s" : ""}`
                  : "Select guests"}

                <Users className="h-4 w-4 text-[#a11d2e]" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[350px] p-4 rounded-2xl">
              <GuestCounter
                label="Adults"
                description="Ages 13+"
                value={adults}
                min={0}
                max={20}
                onChange={setAdults}
              />

              <div className="my-3 h-px bg-border" />

              <GuestCounter
                label="Children"
                description="Ages 2–12"
                value={children}
                min={0}
                max={20 - adults}
                onChange={setChildren}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* SEARCH */}
        <Button
          onClick={onSearch}
          className="
            h-14
            w-full md:w-auto
            rounded-xl
            bg-[#941b2b]
            hover:bg-[#8e1827]
            text-white
            px-7
          "
        >
          Check Availability

          <Search className="ml-2 h-4 w-4" />
        </Button>

        {/* RESET */}
        <Button
          variant="outline"
          onClick={resetFilters}
          className="
            h-14
            w-full md:w-auto
            rounded-xl
            bg-white
          "
        >
          Reset
        </Button>
      </div>
    </div>
  );
}