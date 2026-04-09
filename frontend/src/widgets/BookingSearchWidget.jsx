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
  const [isRangeInvalid, setIsRangeInvalid] = useState(false);

  const totalGuests = adults + children;
  const hasValidRange = !!(range?.from && range?.to);
  const hasGuests = totalGuests > 0;

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

  const handleRangeSelect = (newRange) => {
    setRange(newRange);

    if (!newRange?.from || !newRange?.to) {
      setIsRangeInvalid(false);
      return;
    }

    const conflict = rangeHasConflict(newRange, disabledAll);
    if (conflict && !isRangeInvalid) {
      toast.error("Some selected dates are already booked. Please adjust your stay.");
    }
    setIsRangeInvalid(conflict);
  };

  const onSearch = () => {
    if (!hasValidRange || !hasGuests) {
      toast.error("Please select dates and guests");
      return;
    }

    if (isRangeInvalid) {
      toast.error("Your selected stay includes unavailable dates. Please adjust the dates.");
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
    setIsRangeInvalid(false);
  };

  return (
    <div className="w-full px-4">
      <div className="mx-auto w-full max-w-6xl rounded-3xl bg-white/10 p-4 backdrop-blur-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.3fr_1fr_auto_auto] md:items-end">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white">
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

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white">
              GUESTS
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-14 w-full justify-between rounded-xl border-[#eadfd8] bg-white hover:bg-[#fffaf7]"
                >
                  {totalGuests > 0
                    ? `${totalGuests} guest${totalGuests > 1 ? "s" : ""}`
                    : "Select guests"}
                  <Users className="h-4 w-4 text-[#a11d2e]" />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                className="w-[350px] rounded-2xl p-4"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <GuestCounter
                  label="Adults"
                  description="Ages 13 or above"
                  value={adults}
                  min={0}
                  max={20}
                  onChange={setAdults}
                />

                <div className="my-3 h-px bg-border" />

                <GuestCounter
                  label="Children"
                  description="Ages 2-12"
                  value={children}
                  min={0}
                  max={20 - adults}
                  onChange={setChildren}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            type="button"
            onClick={onSearch}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#941b2b] px-7 text-white shadow-lg shadow-[#a11d2e]/20 hover:bg-[#8e1827] md:w-auto"
          >
            Check Availability
            <Search className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            className="h-14 w-full rounded-xl border-white/60 text-black backdrop-blur-sm hover:bg-white hover:text-black md:w-auto"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
