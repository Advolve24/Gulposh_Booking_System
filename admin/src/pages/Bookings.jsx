import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import {
  MoreHorizontal,
  Calendar,
  Users,
  Moon,
  RotateCcw,
  CheckCircle,
  XCircle,
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

import { Filter } from "lucide-react";
import { listBookingsAdmin } from "@/api/admin";

/* ================= HELPERS ================= */

const fmt = (d, withYear = false) =>
  d ? format(new Date(d), withYear ? "MMM dd, yyyy" : "MMM dd") : "—";

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
      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${
        map[status] || "bg-muted text-muted-foreground"
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
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 8;

  /* ================= LOAD BOOKINGS ================= */

  const loadBookings = async () => {
    try {
      const params = {};
      if (status !== "all") params.status = status;

      const data = await listBookingsAdmin(params);
      setBookings(Array.isArray(data) ? data : []);
      setPage(1);
    } catch {
      toast.error("Failed to load bookings");
    }
  };

  useEffect(() => {
    loadBookings();
  }, [status]);

  /* ================= STATS ================= */

  const totals = useMemo(
    () => ({
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    }),
    [bookings]
  );

  /* ================= PAGINATION ================= */

  const totalPages = Math.max(1, Math.ceil(bookings.length / perPage));
  const visible = bookings.slice((page - 1) * perPage, page * perPage);

  /* ================= UI ================= */

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-4">

        {/* ===== STATS ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={Calendar} label="Total Bookings" value={totals.total} />
          <StatCard
            icon={CheckCircle}
            label="Confirmed"
            value={totals.confirmed}
            color="green"
          />
          <StatCard
            icon={XCircle}
            label="Cancelled"
            value={totals.cancelled}
            color="red"
          />
        </div>

        {/* ===== FILTER BAR ===== */}
        <div className="flex items-center justify-between gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px] h-10">
              <div className="flex items-center gap-2">
                <Filter size={14} />
                <SelectValue placeholder="All Bookings" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={loadBookings}
            className="h-10 w-10 border rounded-lg flex items-center justify-center"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* ===== DESKTOP TABLE ===== */}
        <div className="hidden sm:block bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Guest</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3 text-center">Guests</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {visible.map((b) => (
                <tr key={b._id} className="border-t">
                  <td className="px-4 py-3 text-primary font-medium">
                    {b._id.slice(-5)}
                  </td>

                  <td className="px-4 py-3">
                    <div>{b.user?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.user?.email}
                    </div>
                  </td>

                  <td className="px-4 py-3">{b.room?.name}</td>

                  <td className="px-4 py-3">
                    {fmt(b.startDate, true)} → {fmt(b.endDate, true)}
                  </td>

                  <td className="px-4 py-3 text-center">{b.guests}</td>

                  <td className="px-4 py-3 text-right font-medium">
                    ₹{b.amount.toLocaleString("en-IN")}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={b.status} />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-md hover:bg-muted">
                          <MoreHorizontal size={18} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/bookings/${b._id}`)}
                        >
                          View Booking
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(`/bookings/${b._id}/invoice`)
                          }
                        >
                          View Invoice
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(`/bookings/${b._id}/invoice?download=true`)
                          }
                        >
                          Download Invoice
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ===== MOBILE CARDS ===== */}
        <div className="sm:hidden space-y-3">
          {visible.map((b) => (
            <div
              key={b._id}
              onClick={() => navigate(`/bookings/${b._id}`)}
              className="bg-card border rounded-xl p-4 space-y-2 cursor-pointer"
            >
              <div className="flex justify-between">
                <div className="font-semibold truncate">{b.user?.name}</div>
                <StatusBadge status={b.status} />
              </div>

              <div className="text-xs text-muted-foreground">
                {b.room?.name}
              </div>

              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {fmt(b.startDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Moon size={12} /> {nightsBetween(b.startDate, b.endDate)}N
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} /> {b.guests}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ===== PAGINATION ===== */}
        <div className="flex justify-between items-center pt-3">
          <span className="text-xs text-muted-foreground">
            Showing {visible.length} of {bookings.length}
          </span>

          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              Prev
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ================= STAT CARD ================= */

function StatCard({ icon: Icon, label, value, color }) {
  const map = {
    green: "text-green-600 bg-green-100",
    red: "text-red-600 bg-red-100",
  };

  return (
    <div className="bg-card border rounded-xl p-4 flex justify-between items-center">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
      <div
        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
          map[color] || "bg-muted"
        }`}
      >
        <Icon size={18} />
      </div>
    </div>
  );
}
