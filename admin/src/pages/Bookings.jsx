import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import InvoicePage from "@/pages/InvoicePage";
import {
  MoreHorizontal,
  Calendar,
  Users,
  Moon,
  RotateCcw,
  CheckCircle, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import ViewBookingDialog from "@/components/ViewBookingDialog";
import { Filter } from "lucide-react";

import {
  listBookingsAdmin,
} from "@/api/admin";

/* ================= HELPERS ================= */

const fmt = (d, withYear = false) =>
  d
    ? format(new Date(d), withYear ? "MMM dd, yyyy" : "MMM dd")
    : "—";

const nightsBetween = (from, to) => {
  const a = new Date(from);
  const b = new Date(to);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((b - a) / 86400000));
};

const StatusBadge = ({ status }) => {
  const map = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${map[status] || "bg-muted text-muted-foreground"
        }`}
    >
      {status}
    </span>
  );
};

/* ================= PAGE ================= */

export default function Booking() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);


  const [selectedBooking, setSelectedBooking] = useState(null);

  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 8;
  const downloadInvoice = (bookingId) => {
    navigate(`/bookings/${bookingId}/invoice?download=true`);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  useEffect(() => {
    loadBookings();
  }, [status]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (status !== "all") params.status = status;

      const data = await listBookingsAdmin(params);
      setBookings(Array.isArray(data) ? data : []);
      setPage(1);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  /* ================= STATS ================= */

  const totals = useMemo(() => {
    return {
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings]);

  /* ================= PAGINATION ================= */

  const totalPages = Math.max(
    1,
    Math.ceil(bookings.length / perPage)
  );

  const visible = bookings.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const copyToClipboard = async (value, label = "Text") => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  /* ================= UI ================= */

  return (
    <AppLayout>
      <div
        className="
        mx-auto
        w-full
        max-w-[320px]
        sm:max-w-7xl
        px-1 sm:px-6
        py-4 sm:py-6
        space-y-4 -mt-4
      "
      >
        {/* ================= STATS ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            icon={Calendar}
            label="Total Bookings"
            value={totals.total}
            iconBg="bg-primary/10"
            iconColor="text-primary"
          />

          <StatCard
            icon={CheckCircle}
            label="Confirmed"
            value={totals.confirmed}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />

          <StatCard
            icon={XCircle}
            label="Cancelled"
            value={totals.cancelled}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
        </div>


        {/* ================= FILTER BAR ================= */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger
              className="
                      h-10 w-[160px]
                      bg-card
                      border border-border
                      rounded-lg
                      text-sm
                      focus:ring-1 focus:ring-primary
                    "
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All Bookings" />
              </div>
            </SelectTrigger>

            <SelectContent
              className="
                        bg-card
                        border border-border
                        rounded-lg
                        shadow-lg
                      "
            >
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>


          <button
            onClick={loadBookings}
            className="
            h-10 w-10
            rounded-lg border
            flex items-center justify-center
          "
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* ================= DESKTOP TABLE ================= */}
        <div className="hidden sm:block bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Booking ID</th>
                <th className="px-4 py-3 text-left">Guest Details</th>
                <th className="px-4 py-3 text-left">Room</th>
                <th className="px-4 py-3 text-left">Dates</th>
                <th className="px-4 py-3 text-center">Nights</th>
                <th className="px-4 py-3 text-center">Guests</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>

            <tbody>
              {visible.map((b) => (
                <tr key={b._id} className="border-t">
                  <td className="px-4 py-3 font-medium text-primary">
                    {b.bookingId || b._id?.slice(-5)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="sm:font-medium">
                      {b.user?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {b.user?.email}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {b.room?.name || "Entire Villa"}
                  </td>

                  <td className="px-4 py-3">
                    {fmt(b.startDate, true)}
                    <div className="text-xs text-muted-foreground">
                      to {fmt(b.endDate, true)}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {nightsBetween(b.startDate, b.endDate)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {b.guests}
                  </td>

                  <td className="px-4 py-3 text-right font-medium">
                    ₹{Number(b.amount || 0).toLocaleString("en-IN")}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={b.status} />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-md hover:bg-muted">
                          <MoreHorizontal size={18} className="text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="end"
                        className="w-52 bg-card border border-border rounded-lg shadow-lg"
                      >
                        {/* VIEW BOOKING */}
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedBooking(b);
                            setViewOpen(true);
                          }}
                        >
                          View Booking
                        </DropdownMenuItem>


                        {/* VIEW INVOICE */}
                        <DropdownMenuItem
                          onClick={() => navigate(`/bookings/${b._id}/invoice`)}
                        >
                          View Invoice
                        </DropdownMenuItem>



                        {/* DOWNLOAD INVOICE */}
                        <DropdownMenuItem
                          onClick={() => downloadInvoice(b._id)}
                          className="cursor-pointer"
                        >
                          Download Invoice
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* COPY EMAIL */}
                        <DropdownMenuItem
                          onClick={() =>
                            copyToClipboard(
                              b.user?.email || b.guestEmail,
                              "Email"
                            )
                          }
                          className="cursor-pointer"
                        >
                          Copy Email
                        </DropdownMenuItem>

                        {/* COPY PHONE */}
                        <DropdownMenuItem
                          onClick={() =>
                            copyToClipboard(
                              b.user?.phone || b.guestPhone,
                              "Phone number"
                            )
                          }
                          className="cursor-pointer"
                        >
                          Copy Phone
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ================= MOBILE LIST ================= */}
        <div className="sm:hidden space-y-3">
          {visible.map((b) => (
            <div
              key={b._id}
              className="bg-card border rounded-xl p-4 space-y-3"
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold truncate">
                    {b.user?.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {b.user?.email}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={b.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded-md hover:bg-muted">
                        <MoreHorizontal size={18} className="text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="end"
                      className="w-52 bg-card border border-border rounded-lg shadow-lg"
                    >
                      {/* VIEW BOOKING */}
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedBooking(b);
                          setViewOpen(true);
                        }}
                      >
                        View Booking
                      </DropdownMenuItem>

                      {/* VIEW INVOICE */}
                      <DropdownMenuItem
                        onClick={() => navigate(`/bookings/${b._id}/invoice`)}
                      >
                        View Invoice
                      </DropdownMenuItem>



                      {/* DOWNLOAD INVOICE */}
                      <DropdownMenuItem
                        onClick={() => downloadInvoice(b._id)}
                        className="cursor-pointer"
                      >
                        Download Invoice
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {/* COPY EMAIL */}
                      <DropdownMenuItem
                        onClick={() =>
                          copyToClipboard(
                            b.user?.email || b.guestEmail,
                            "Email"
                          )
                        }
                        className="cursor-pointer"
                      >
                        Copy Email
                      </DropdownMenuItem>

                      {/* COPY PHONE */}
                      <DropdownMenuItem
                        onClick={() =>
                          copyToClipboard(
                            b.user?.phone || b.guestPhone,
                            "Phone number"
                          )
                        }
                        className="cursor-pointer"
                      >
                        Copy Phone
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="bg-muted rounded-lg px-3 py-2 text-sm truncate">
                {b.room?.name || "Entire Villa"}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar size={13} />
                  {fmt(b.startDate)}
                </span>

                <span className="flex items-center gap-1">
                  <Moon size={13} />
                  {nightsBetween(b.startDate, b.endDate)} nights
                </span>

                <span className="flex items-center gap-1">
                  <Users size={13} />
                  {b.guests} guests
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ================= PAGINATION ================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
          {/* LEFT TEXT */}
          <div className="text-xs sm:text-sm text-muted-foreground">
            Showing {visible.length} of {bookings.length} bookings
          </div>

          {/* PAGINATION */}
          <div className="flex items-center gap-1">
            {/* PREVIOUS */}
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
            >
              Previous
            </button>

            {/* DESKTOP PAGE NUMBERS */}
            <div className="hidden sm:flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[36px] px-3 py-1 border rounded-md text-sm
              ${page === p
                        ? "bg-primary text-white border-primary"
                        : "bg-background"
                      }
            `}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* MOBILE CURRENT PAGE */}
            <div className="sm:hidden">
              <span className="px-3 py-1 border rounded-md text-sm bg-primary text-white">
                {page}
              </span>
            </div>

            {/* NEXT */}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

      </div>


      <ViewBookingDialog
  open={viewOpen}
  onOpenChange={setViewOpen}
  bookingId={selectedBooking?._id}
/>

    </AppLayout>

  );
}

/* ================= COMPONENTS ================= */

// ================= STAT CARD (INLINE – BOOKINGS ONLY) =================
function StatCard({
  icon: Icon,
  label,
  value,
  iconBg = "bg-muted",
  iconColor = "text-primary",
}) {
  return (
    <div
      className="
        w-full
        bg-card border border-border rounded-xl
        p-3 sm:p-4
        flex items-center justify-between
        min-h-[72px] sm:min-h-[96px]
      "
    >
      {/* LEFT */}
      <div className="flex flex-col leading-tight">
        <p className="text-[11px] sm:text-sm text-muted-foreground">
          {label}
        </p>

        <h2 className="text-[18px] sm:text-2xl font-semibold mt-1">
          {value}
        </h2>
      </div>

      {/* ICON */}
      <div
        className={`
          h-9 w-9 sm:h-11 sm:w-11
          rounded-lg
          flex items-center justify-center
          shrink-0
          ${iconBg}
        `}
      >
        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
      </div>
    </div>
  );
}

