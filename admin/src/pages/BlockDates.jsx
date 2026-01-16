import { useEffect, useState } from "react";
import { format, startOfToday, addDays } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Calendar } from "@/components/ui/calendar";
import {
  listBlackouts,
  createBlackout,
  deleteBlackout,
  listBookingsAdmin,
} from "@/api/admin";
import { toast } from "sonner";


const toDateKey = (date) => format(date, "yyyy-MM-dd");

const fromDateKey = (key) => new Date(`${key}T12:00:00`);


export default function BlockDates() {
  const today = startOfToday();
  const todayKey = toDateKey(today);

  const [blackouts, setBlackouts] = useState([]);
  const [bookedDates, setBookedDates] = useState(new Set());

  const [range, setRange] = useState({
    from: null, 
    to: null,   
  });


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [blk, bookings] = await Promise.all([
      listBlackouts(),
      listBookingsAdmin({ limit: 500 }),
    ]);

    setBlackouts(
      (blk || []).map((b) => ({
        ...b,
        fromKey: toDateKey(new Date(b.from)),
        toKey: toDateKey(new Date(b.to)),
      }))
    );

    const booked = new Set();

    bookings?.forEach((b) => {
      let d = toDateKey(new Date(b.startDate));
      const end = toDateKey(new Date(b.endDate));

      while (d <= end) {
        booked.add(d);
        d = toDateKey(addDays(new Date(d), 1));
      }
    });

    setBookedDates(booked);
  };


  const isBooked = (date) =>
    bookedDates.has(toDateKey(date));

  const isBlocked = (date) => {
    const key = toDateKey(date);
    return blackouts.some(
      (b) => key >= b.fromKey && key <= b.toKey
    );
  };

  const isRangeValid = (fromKey, toKey) => {
    let d = fromKey;
    while (d <= toKey) {
      if (bookedDates.has(d)) return false;
      d = toDateKey(addDays(new Date(d), 1));
    }
    return true;
  };


  const onBlock = async () => {
    if (!range.from || !range.to) return;

    try {
      await createBlackout({
        from: range.from, 
        to: range.to,    
      });

      toast.success("Dates blocked successfully");
      setRange({ from: null, to: null });
      fetchData();
    } catch {
      toast.error("Failed to block dates");
    }
  };


  return (
    <AppLayout>
      <div className="flex flex-col w-full md:flex-row justify-between gap-6 py-2 md:py-0">

        <div className="w-full md:w-[60%] bg-card border rounded-xl p-4 md:p-6">
          <h2 className="font-semibold text-lg mb-4">
            Select Dates to Block
          </h2>

          <Calendar
            mode="range"
            numberOfMonths={1}
            fromDate={today}
            selected={
              range.from
                ? {
                    from: fromDateKey(range.from),
                    to: range.to
                      ? fromDateKey(range.to)
                      : undefined,
                  }
                : undefined
            }
            onSelect={(r) => {
              if (!r?.from) {
                setRange({ from: null, to: null });
                return;
              }

              const fromKey = toDateKey(r.from);
              const toKey = r.to ? toDateKey(r.to) : null;

              if (toKey && !isRangeValid(fromKey, toKey)) {
                toast.error(
                  "Selected range includes booked or blocked dates"
                );
                return;
              }

              setRange({ from: fromKey, to: toKey });
            }}
            disabled={(date) =>
              toDateKey(date) < todayKey ||
              isBooked(date) ||
              isBlocked(date)
            }
            className="
              w-full max-w-none rounded-lg p-6 text-base
              [&_.rdp-month]:w-full
              [&_.rdp-table]:w-full
            "
            classNames={{
              months: "flex w-full flex-col justify-center",
              month: "w-full space-y-4 flex flex-col items-center",

              caption: "flex justify-center items-center text-lg font-semibold",
              caption_label: "text-xl font-semibold",

              nav: "flex items-center justify-between gap-4",
              nav_button:
                "h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center",

              table: "w-full border-collapse",
              head_row: "grid grid-cols-7",
              head_cell:
                "text-center text-sm font-medium text-muted-foreground",

              row: "grid grid-cols-7 mt-2",
              cell: "flex justify-center",

              day: "w-10 h-10 md:h-14 md:w-14 text-base rounded-lg hover:bg-muted",
              day_today: "border border-primary",

              day_range_start:
                "bg-primary text-primary-foreground rounded-l-xl",
              day_range_end:
                "bg-primary text-primary-foreground rounded-r-xl",
              day_range_middle:
                "bg-primary/15 text-primary rounded-none",

              day_disabled:
                "opacity-40 cursor-not-allowed text-muted-foreground",
            }}
          />

          <button
            disabled={!range.from || !range.to}
            onClick={onBlock}
            className="mt-4 w-full h-10 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            Block Selected Dates
          </button>
        </div>

        {/* ================= BLOCKED RANGES ================= */}
        <div className="w-full md:w-[38%] bg-card border rounded-xl  md:p-6 p-4">
          <h3 className="font-semibold mb-4">Blocked Ranges</h3>

          <div className="space-y-3">
            {blackouts.map((b) => (
              <div
                key={b._id}
                className="flex items-center bg-gray-100 justify-between border rounded-lg px-3 py-4"
              >
                <span className="text-sm">
                  {format(fromDateKey(b.fromKey), "dd MMM")} –{" "}
                  {format(fromDateKey(b.toKey), "dd MMM")}
                </span>

                <button
                  onClick={async () => {
                    await deleteBlackout(b._id);
                    toast.success("Unblocked");
                    fetchData();
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
