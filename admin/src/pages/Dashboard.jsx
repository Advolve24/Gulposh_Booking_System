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
import MobileBookingCard from "@/components/MobileBookingCard";
import BookingTable from "@/components/BookingTable";
import BookingViewPopup from "@/components/BookingViewPopup";
import { getBookingAdmin } from "../api/admin";


const toDateKey = (d) => format(d, "yyyy-MM-dd");



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


function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  hintColor,
  onClick,
  bg,
  textColor = "text-foreground",
  mobileFull = false,
  iconColor,
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={`
        ${mobileFull ? "col-span-2 md:col-span-1" : ""}
        w-full
        rounded-xl
        p-3 sm:p-4
        min-h-[100px]
        flex items-start md:items-center justify-between
        transition
        ${onClick ? "cursor-pointer hover:opacity-90" : ""}
      `}
      style={{ backgroundColor: bg }}
    >
      {/* LEFT */}
      <div className={`flex md:w-auto w-[60%] flex-col gap-4 ${textColor}`}>
        <p className="text-sm opacity-80">{label}</p>
        <h2 className="text-2xl font-semibold">{value}</h2>

        {hint && (
          <p className={`hidden sm:block text-sm ${hintColor}`}>
            {hint}
          </p>
        )}
      </div>

      {/* ICON */}
      <div className={`h-10 w-10 rounded-lg bg-black/10 flex items-center justify-center`}>
        <Icon className={`h-5 w-5 ${iconColor ?? ""}`} />
      </div>
    </div>
  );
}

function UpcomingBookingCard({ booking }) {
  if (!booking) return null;

  const date = new Date(booking.startDate);

  return (
    <div className="bg-[#DCEEE2] rounded-xl p-4 flex flex-col items-center justify-center text-center">
      <p className="text-sm font-medium text-green-900 mb-2">
        Upcoming Booking
      </p>

      <h2 className="text-4xl font-extrabold text-green-700 leading-none">
        {format(date, "dd")}
      </h2>

      <p className="text-sm font-semibold text-green-800 uppercase">
        {format(date, "MMM")}
      </p>
    </div>
  );
}



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
  const [selectedBooking, setSelectedBooking] = useState(null);




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


        setBookings(bookingsRes || []);

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



  const isSameDay = (a, b) =>
    a && b && toDateKey(a) === toDateKey(b);

  const getBookingCountForDate = (date) => {
    const key = toDateKey(date);

    return bookings.some((b) => {
      const start = toDateKey(new Date(b.startDate));
      const end = toDateKey(new Date(b.endDate));
      return key >= start && key <= end;
    });
  };

  const isDateBlocked = (date) => {
    const key = toDateKey(date);

    return blackouts.some((blk) => {
      const from = toDateKey(new Date(blk.from));
      const to = toDateKey(new Date(blk.to));
      return key >= from && key <= to;
    });
  };

  const getBlackoutForDate = (date) => {
    const key = toDateKey(date);

    return blackouts.find((blk) => {
      const from = toDateKey(new Date(blk.from));
      const to = toDateKey(new Date(blk.to));
      return key >= from && key <= to;
    });
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

  const upcomingBooking = useMemo(() => {
    const today = startOfToday();

    return bookings
      .filter(b => new Date(b.startDate) >= today)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
  }, [bookings]);




  return (
    <AppLayout>
      <div
        className="
    grid grid-cols-2
    gap-3
    justify-items-center
    sm:grid-cols-2
    md:grid-cols-4
    sm:max-w-full
    py-0
  "
      >


        <StatCard
          icon={CalendarDays}
          label="Total Bookings"
          value={stats?.totalBookings ?? 0}
          hint={`${bookingChange > 0 ? "+" : ""}${bookingChange}% from last month`}
          hintColor={bookingChange >= 0 ? "text-green-600" : "text-red-600"}
          onClick={() => navigate("/bookings")}
          bg="#ebebeb"
          mobileFull
        />


        <StatCard
          icon={CalendarCheck2}
          label="Confirmed Bookings"
          value={bookings.filter(b => b.status === "confirmed").length}
          hint="Paid & confirmed stays"
          hintColor="text-green-600"
          onClick={() => navigate("/bookings?status=confirmed")}
          bg="white"
        />

        <StatCard
          icon={XCircle}
          label="Cancelled"
          value={stats?.cancelledBookings ?? 0}
          hint={`${cancelledChange > 0 ? "+" : ""}${cancelledChange}% from last month`}
          hintColor={cancelledChange <= 0 ? "text-green-600" : "text-red-600"}
          onClick={() => navigate("/bookings?status=cancelled")}
          bg="white"
        />


        <StatCard
          icon={Wallet}
          label="Total Revenue"
          value={`₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`}
          hint={`${revenueChange > 0 ? "+" : ""}${revenueChange}% from last month`}
          hintColor={revenueChange >= 0 ? "text-green-300" : "text-red-300"}
          onClick={() => navigate("/bookings?paid=true")}
          bg="#671e30"
          textColor="text-white"
          iconColor="text-white"
          mobileFull
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
            px-4 py-3 sm:p-6
            overflow-hidden
            max-h-[calc(100vh-180px)]
            sm:max-h-none w-[88vw] md:w-full
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
                  disabled={isSameMonth(currentMonth, startOfMonth(new Date()))}
                  onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                  className="disabled:opacity-40 disabled:cursor-not-allowed"
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
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date) => {
                  const isBlocked = isDateBlocked(date);
                  const hasBooking = getBookingCountForDate(date);

                  return (
                    <div
                      key={date.toISOString()}
                      className={`
          h-10 w-full rounded-lg
          flex items-center justify-center
          text-sm font-medium
          border
          ${isBlocked
                          ? "bg-red-100 text-red-700 border-red-300"
                          : hasBooking
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-white border-border"
                        }
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

        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3">
          <h3 className="font-semibold">Quick Actions</h3>

          <Action icon={Plus} title="Add Room" desc="Create a new room listing" link="/rooms/new" />
          <Action icon={Home} title="Book Villa" desc="Book the entire property" link="/villa-booking" />
          <Action icon={Ban} title="Block Dates" desc="Select dates directly in calendar" link="/block-dates" />

          {/* UPCOMING BOOKING */}
          {upcomingBooking && (
            <UpcomingBookingCard booking={upcomingBooking} />
          )}
        </div>

      </div>

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

        <div className="hidden lg:block">
          <BookingTable
            bookings={recentBookings}
            onRowClick={async (b) => {
              try {
                const full = await getBookingAdmin(b._id);
                setSelectedBooking(full);
              } catch {
                toast.error("Failed to load booking details");
              }
            }}
            onViewInvoice={(b) =>
              navigate(`/bookings/${b._id}/invoice`)
            }
            onDownloadInvoice={(b) =>
              navigate(`/bookings/${b._id}/invoice?download=true`)
            }
          />

        </div>

        <div className="space-y-3 lg:hidden">
          {recentBookings.map((b) => (
            <MobileBookingCard
              key={b._id}
              booking={b}
              onOpen={async (b) => {
                try {
                  const full = await getBookingAdmin(b._id);
                  setSelectedBooking(full);
                } catch {
                  toast.error("Failed to load booking details");
                }
              }}
              onViewInvoice={(booking) =>
                navigate(`/bookings/${booking._id}/invoice`)
              }
              onDownloadInvoice={(booking) =>
                navigate(`/bookings/${booking._id}/invoice?download=true`)
              }
            />
          ))}
        </div>
      </div>


      <BookingViewPopup
        open={!!selectedBooking}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />


    </AppLayout>
  );
}


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
