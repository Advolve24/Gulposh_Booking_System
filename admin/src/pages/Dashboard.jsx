import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  format,
  addDays,
  startOfToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWithinInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isAfter,
} from "date-fns";

import {
  CalendarDays,
  CalendarCheck2,
  XCircle,
  Wallet,
  Plus,
  Home,
  Ban,
  Calendar, Moon, Users
} from "lucide-react";

import {
  getStats,
  listBookingsAdmin,
  listBlackouts,
  createBlackout,
  deleteBlackout,
} from "../api/admin";



const toDateSafe = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const safeFormat = (v, f = "dd MMM yyyy") => {
  const d = toDateSafe(v);
  return d ? format(d, f) : "—";
};

const percentChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
};



function StatusBadge({ status }) {
  const map = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    completed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[status]}`}>
      {status}
    </span>
  );
}


function StatCard({ icon: Icon, label, value, hint, hintColor, onClick }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={`
        w-[150px] sm:w-full
        bg-card border border-border rounded-xl
        p-3 sm:p-4
        flex items-center justify-between
        min-h-[75px] sm:min-h-[100px]
        transition
        ${onClick ? "cursor-pointer hover:border-primary" : ""}
      `}
    >
      {/* LEFT */}
      <div className="flex flex-col space-y-0.5 sm:space-y-1 leading-tight">
        <p className="text-[10px] sm:text-sm text-muted-foreground">
          {label}
        </p>

        <h2 className="text-[16px] sm:text-2xl font-semibold leading-none">
          {value}
        </h2>

        {hint && (
          <p
            className={`hidden sm:block text-[10px] sm:text-sm ${hintColor}`}
          >
            {hint}
          </p>
        )}
      </div>

      {/* ICON */}
      <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
      </div>
    </div>
  );
}



/* ===============================
   DASHBOARD
================================ */
export default function Dashboard() {
  const [showBlockHint, setShowBlockHint] = useState(false);
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [blackouts, setBlackouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [blockSelection, setBlockSelection] = useState([]);
  const [blockStart, setBlockStart] = useState(null);
  const [blockEnd, setBlockEnd] = useState(null);
  const [savingBlock, setSavingBlock] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const navigate = useNavigate();



  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);





  /* ===============================
     FETCH DATA
  ================================ */
  useEffect(() => {
    (async () => {
      try {
        const [statsRes, bookingsRes, blackoutsRes] = await Promise.all([
          getStats(),
          listBookingsAdmin({ limit: 200 }),
          listBlackouts(), // ✅ NO custom headers
        ]);

        setStats({
          totalBookings: statsRes.bookings ?? 0,
          upcomingBookings: statsRes.upcoming ?? 0,
          cancelledBookings: statsRes.cancelled ?? 0,
          totalRevenue: statsRes.revenue ?? 0,

          // Optional – until backend supports it
          lastMonth: {
            totalBookings: 0,
            cancelledBookings: 0,
            totalRevenue: 0,
          },
        });


        setBookings(
          (bookingsRes || []).map((b) => ({
            _id: b._id,
            bookingId: b.bookingId || `BK${b._id.slice(-4)}`,
            guestName: b.contactName || b.user?.name || "—",
            roomName: b.room?.name || "Entire Villa",
            guests: b.guests || 1,
            status: b.status,
            createdAt: new Date(b.createdAt),
            checkIn: new Date(b.startDate),
            checkOut: new Date(b.endDate),
          }))
        );

        setBlackouts(
          (blackoutsRes || []).map((b) => ({
            _id: b._id,
            from: new Date(b.from),
            to: new Date(b.to),
          }))
        );


      } catch (err) {
        console.error(err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  const toDateOnly = (d) => {
    if (!d) return null;
    return new Date(Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate()
    ));
  };

  const isSameDay = (a, b) =>
    a && b && toDateOnly(a).getTime() === toDateOnly(b).getTime();

  const getBookingCountForDate = (date) => {
    const d = toDateOnly(date);

    return bookings.filter((b) => {
      const start = toDateOnly(b.checkIn);
      const end = toDateOnly(b.checkOut);
      return isWithinInterval(d, { start, end });
    }).length;
  };

  const isDateBlocked = (date) => {
    const d = toDateOnly(date);

    return blackouts.some((blk) => {
      const from = toDateOnly(blk.from);
      const to = toDateOnly(blk.to);
      return isWithinInterval(d, { start: from, end: to });
    });
  };

  const getBlackoutForDate = (date) => {
    const d = toDateOnly(date);

    return blackouts.find((blk) =>
      isWithinInterval(d, {
        start: toDateOnly(blk.from),
        end: toDateOnly(blk.to),
      })
    );
  };



  const getBarColor = (count) => {
    if (count === 0) return "bg-[#E8DCDC]";
    if (count <= 2) return "bg-[#C9A7A7]";
    if (count <= 4) return "bg-[#9E6B6B]";
    return "bg-[#6B2C2C]";
  };


  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });

    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(start, i);
      const blocked = isDateBlocked(date);

      return {
        date,
        isBlocked: blocked,
        count: blocked ? 0 : getBookingCountForDate(date),
      };
    });
  }, [bookings, blackouts]);



  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });

    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const isSelectedForBlock = (date) =>
    blockSelection.some((d) => isSameDay(d, date));

  const onCalendarDateClick = async (date) => {
    const bookingCount = getBookingCountForDate(date);
    const blackout = getBlackoutForDate(date);

    if (blackout) {
      if (!window.confirm("Unblock this date?")) return;

      try {
        await deleteBlackout(blackout._id);
        toast.success("Date unblocked");

        const fresh = await listBlackouts();
        setBlackouts(
          fresh.map((b) => ({
            _id: b._id,
            from: toDateSafe(b.from),
            to: toDateSafe(b.to),
          }))
        );
      } catch {
        toast.error("Failed to unblock date");
      }
      return;
    }

    if (bookingCount > 0) {
      toast.error("Booked dates cannot be blocked");
      return;
    }

    if (!blockStart) {
      setBlockStart(date);
      toast.info("Select end date to block");
      return;
    }

    const from = isAfter(date, blockStart) ? blockStart : date;
    const to = isAfter(date, blockStart) ? date : blockStart;

    if (rangeHasBooking(from, to)) {
      toast.error("Selected range includes booked dates");
      setBlockStart(null);
      setBlockEnd(null);
      return;
    }

    try {
      setSavingBlock(true);

      await createBlackout({ from, to });
      toast.success("Dates blocked successfully");

      const fresh = await listBlackouts();
      setBlackouts(
        fresh.map((b) => ({
          _id: b._id,
          from: toDateSafe(b.from),
          to: toDateSafe(b.to),
        }))
      );
    } catch {
      toast.error("Failed to block dates");
    } finally {
      setBlockStart(null);
      setBlockEnd(null);
      setSavingBlock(false);
    }
  };

  const rangeHasBooking = (start, end) => {
    const days = eachDayOfInterval({ start, end });

    return days.some((d) => getBookingCountForDate(d) > 0);
  };

  // CALCULATE CHANGES //

  const {
    bookingChange,
    cancelledChange,
    revenueChange,
  } = useMemo(() => {
    if (!bookings.length) {
      return {
        bookingChange: 0,
        cancelledChange: 0,
        revenueChange: 0,
      };
    }

    const now = new Date();

    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));

    const thisMonthBookings = bookings.filter(
      (b) =>
        b.createdAt &&
        isWithinInterval(b.createdAt, {
          start: thisMonthStart,
          end: now,
        })
    );

    const lastMonthBookings = bookings.filter(
      (b) =>
        b.createdAt &&
        isWithinInterval(b.createdAt, {
          start: lastMonthStart,
          end: thisMonthStart,
        })
    );

    const bookingChange =
      lastMonthBookings.length === 0
        ? 100
        : Math.round(
          ((thisMonthBookings.length - lastMonthBookings.length) /
            lastMonthBookings.length) *
          100
        );

    const cancelledThisMonth = thisMonthBookings.filter(
      (b) => b.status === "cancelled"
    ).length;

    const cancelledLastMonth = lastMonthBookings.filter(
      (b) => b.status === "cancelled"
    ).length;

    const cancelledChange =
      cancelledLastMonth === 0
        ? 0
        : Math.round(
          ((cancelledThisMonth - cancelledLastMonth) /
            cancelledLastMonth) *
          100
        );

    const revenueThisMonth = thisMonthBookings.reduce(
      (sum, b) => sum + (b.amount || 0),
      0
    );

    const revenueLastMonth = lastMonthBookings.reduce(
      (sum, b) => sum + (b.amount || 0),
      0
    );

    const revenueChange =
      revenueLastMonth === 0
        ? 0
        : Math.round(
          ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        );

    return {
      bookingChange,
      cancelledChange,
      revenueChange,
    };
  }, [bookings]);


  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [bookings]);



  return (
    <AppLayout>
      {/* ===== STATS ===== */}
      <div
        className="
    grid grid-cols-2
    gap-3
    justify-items-center
    sm:grid-cols-2
    md:grid-cols-4
    max-w-[320px] sm:max-w-full
    py-4
  "
      >


        <StatCard
          icon={CalendarDays}
          label="Total Bookings"
          value={stats?.totalBookings ?? 0}
          hint={`${bookingChange > 0 ? "+" : ""}${bookingChange}% from last month`}
          hintColor={bookingChange >= 0 ? "text-green-600" : "text-red-600"}
          onClick={() => navigate("/bookings")}
        />

        <StatCard
          icon={CalendarCheck2}
          label="Confirmed Bookings"
          value={bookings.filter(b => b.status === "confirmed").length}
          hint="Paid & confirmed stays"
          hintColor="text-green-600"
          onClick={() => navigate("/bookings?status=confirmed")}
        />

        <StatCard
          icon={XCircle}
          label="Cancelled"
          value={stats?.cancelledBookings ?? 0}
          hint={`${cancelledChange > 0 ? "+" : ""}${cancelledChange}% from last month`}
          hintColor={cancelledChange <= 0 ? "text-green-600" : "text-red-600"}
          onClick={() => navigate("/bookings?status=cancelled")}
        />

        <StatCard
          icon={Wallet}
          label="Total Revenue"
          value={`₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`}
          hint={`${revenueChange > 0 ? "+" : ""}${revenueChange}% from last month`}
          hintColor={revenueChange >= 0 ? "text-green-600" : "text-red-600"}
          onClick={() => navigate("/bookings?paid=true")}
        />

      </div>

      {/* ===== CALENDAR + QUICK ACTIONS ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        {/* Calendar */}
        <div className="
            xl:col-span-2
            bg-card
            border border-border
            rounded-xl
            px-2 py-3 sm:p-6
            overflow-hidden
            max-h-[calc(100vh-180px)]
            sm:max-h-none  max-w-[320px] sm:max-w-none
          ">

          {/* ================= HEADER ================= */}
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div className="space-y-0.5">
              <h3 className="font-semibold text-base">Booking Calendar</h3>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                {format(currentMonth, "MMMM yyyy")}
              </p>

            </div>

          </div>

          {(
            <>
              {/* MONTH NAV */}
              <div className="flex items-center justify-between mb-2 sm:mb-5">


                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                  className="text-xl"
                >
                  ‹
                </button>

                <h4 className="font-semibold text-sm sm:text-lg">
                  {format(currentMonth, "MMMM yyyy")}
                </h4>

                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="text-xl"
                >
                  ›
                </button>
              </div>

              {/* WEEK LABELS */}
              <div className="grid grid-cols-7 mb-[6px] text-[9px] sm:text-xs text-muted-foreground text-center leading-none">

                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              {/* MONTH GRID */}
              <div className="grid grid-cols-7 gap-[2px] sm:gap-3 w-full">

                {calendarDays.map((date) => {
                  const bookingCount = getBookingCountForDate(date);
                  const blocked = isDateBlocked(date);
                  const isBooked = bookingCount > 0;

                  return (
                    <div
                      key={date.toISOString()}
                      onClick={() => onCalendarDateClick(date)}
                      className={`
                         aspect-square
                          rounded-md sm:rounded-xl
                          border
                          flex items-center justify-center
                          text-[10px] sm:text-sm
                          font-semibold
                          leading-none
                          h-[50px] w-[80px]
                          max-h-[36px] sm:max-h-none cursor-pointer

                          ${!isSameMonth(date, currentMonth)
                          ? "opacity-30 pointer-events-none"
                          : ""}

                          ${blocked
                          ? "bg-red-50 border-red-300"
                          : isBooked
                            ? "bg-amber-50 border-amber-200 cursor-not-allowed"
                            : "bg-white hover:border-primary"}
                          `}
                    >
                      {format(date, "dd")}
                    </div>

                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ================= QUICK ACTIONS ================= */}
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3  max-w-[320px] sm:max-w-none">

          <h3 className="font-semibold">Quick Actions</h3>
          <Action icon={Plus} title="Add Room" desc="Create a new room listing" link="/rooms/new" />
          <Action icon={Home} title="Book Villa" desc="Book the entire property" link="/villa-booking" />
          <Action icon={Ban} title="Block Dates" desc="Select dates directly in calendar" />

        </div>
      </div>

      {/* ===== RECENT BOOKINGS ===== */}
      <div className="bg-card border border-border rounded-xl mt-6 p-4 sm:p-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-md font-semibold">Recent Bookings</h2>
          <Link
            to="/bookings"
            className="px-3 py-1.5 rounded-md border text-[12px] font-medium
      hover:bg-muted transition"
          >
            View all
          </Link>
        </div>

        {/* ================= DESKTOP TABLE (lg+) ================= */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="py-3 text-left">Booking ID</th>
                <th className="py-3 text-left">Guest</th>
                <th className="py-3 text-left">Room</th>
                <th className="py-3 text-left">Check-in</th>
                <th className="py-3 text-left">Check-out</th>
                <th className="py-3 text-center">Guests</th>
                <th className="py-3 text-center">Status</th>
              </tr>
            </thead>

            <tbody>
              {recentBookings.map((b) => (
                <tr key={b._id} className="border-b last:border-b-0">
                  <td className="py-4 text-primary">{b.bookingId}</td>
                  <td className="py-4">{b.guestName}</td>
                  <td className="py-4">{b.roomName}</td>
                  <td className="py-4">{safeFormat(b.checkIn)}</td>
                  <td className="py-4">{safeFormat(b.checkOut)}</td>
                  <td className="py-4 text-center">{b.guests}</td>
                  <td className="py-4 text-center">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ================= MOBILE + TABLET CARDS (md & below) ================= */}
        <div className="space-y-3 lg:hidden">
          {recentBookings.map((b) => (
            <div
              key={b._id}
              className="border rounded-xl p-4 bg-background"
            >
              {/* TOP ROW */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base text-[14px] leading-tight">
                    {b.guestName}
                  </p>
                  <p className="text-[12px]  text-muted-foreground break-all">
                    {b.email}
                  </p>
                </div>

                <StatusBadge status={b.status} />
              </div>

              {/* ROOM */}
              <div className="mt-3 px-3 py-2 rounded-lg bg-muted text-[12px] font-medium">
                {b.roomName}
              </div>

              {/* META INFO */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-[12px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{safeFormat(b.checkIn, "MMM dd")}</span>
                </div>

                <div className="flex items-center gap-1.5 justify-center">
                  <Moon className="h-4 w-4 text-muted-foreground" />
                  <span>{b.nights} nights</span>
                </div>

                <div className="flex items-center gap-1.5 justify-end">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{b.guests} guests</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

    </AppLayout>
  );
}

/* ===============================
   QUICK ACTION CARD
================================ */
function Action({ icon: Icon, title, desc, link, onClick }) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (link) {
      window.location.href = link;
    }
  };

  return (
    <div
      onClick={handleClick}
      className="
        flex items-center gap-3 sm:gap-4
        p-3 sm:p-4
        bg-secondary rounded-xl
        cursor-pointer hover:bg-secondary/70
        transition 
      "
    >
      {/* ICON */}
      <div className="
        h-9 w-9 sm:h-10 sm:w-10
        rounded-lg bg-background
        flex items-center justify-center
        shrink-0
      ">
        <Icon size={16} className="sm:hidden" />
        <Icon size={18} className="hidden sm:block" />
      </div>

      {/* TEXT */}
      <div className="min-w-0">
        <p className="font-medium text-sm sm:text-base leading-tight">
          {title}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
          {desc}
        </p>
      </div>
    </div>
  );
}
