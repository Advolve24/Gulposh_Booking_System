import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { useSearchParams } from "react-router-dom";
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

const dateFmt = (d) => (d ? format(new Date(d), "dd MMM yy") : "—");

const nightsBetween = (from, to) => {
  const a = new Date(from);
  const b = new Date(to);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((b - a) / 86400000));
};

const StatusBadge = ({ status }) => {
  const map = {
    confirmed: "bg-green-100 text-green-700 border-green-300",
    pending: "bg-orange-100 text-orange-700 border-orange-300",
    cancelled: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium border ${map[status] || "bg-muted text-muted-foreground"
        }`}
    >
      {status === "confirmed" ? "Paid" : status}
    </span>
  );
};

const guestLabel = (b) => {
  const adults = Number(b.adults ?? b.guests ?? 0);
  const children = Number(b.children ?? 0);
  const total = adults + children;

  return {
    main: `${adults} Adults, ${children} Children`,
    sub: `Total: ${total} Guests`,
  };
};


export default function Booking() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 8;
  const [params] = useSearchParams();


  const filteredBookings = useMemo(() => {
    if (status === "all") return bookings;
    return bookings.filter(b => b.status === status);
  }, [bookings, status]);



  useEffect(() => {
    const statusFromUrl = params.get("status") || "all";
    setStatus(statusFromUrl);
  }, [params]);

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

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / perPage));
  const visible = filteredBookings.slice(
    (page - 1) * perPage,
    page * perPage
  );

  return (
    <AppLayout>
      <div className=" max-w-7xl space-y-6 py-6">

        {/* FILTER */}
        <div className="flex items-center justify-between gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px] h-10">
              <div className="flex items-center gap-2">
                <Filter size={14} />
                <SelectValue placeholder="All Bookings" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="confirmed">Paid</SelectItem>
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

        {/* DESKTOP TABLE */}
        <div className="hidden sm:block bg-card border rounded-xl">
          <div className="relative overflow-x-auto">
            <table className="min-w-[1200px] w-full text-sm">

              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left">Booking ID</th>
                  <th className="px-4 py-3 text-left">Guest</th>
                  <th className="px-4 py-3 text-left">Room</th>
                  <th className="px-4 py-3 text-left">Check in</th>
                  <th className="px-4 py-3 text-left">Check out</th>
                  <th className="px-4 py-3 text-center">Nights</th>
                  <th className="px-4 py-3 text-left">Guests</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Payment</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {visible.map((b, i) => (
                  <tr key={b._id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-400" />
                        #{b._id.slice(-6)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium">{b.user?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.user?.phone}
                      </div>
                    </td>

                    <td className="px-4 py-3">{b.room?.name}</td>

                    <td className="px-4 py-3">
                      {dateFmt(b.startDate)}
                    </td>

                    <td className="px-4 py-3">
                      {dateFmt(b.endDate)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {nightsBetween(b.startDate, b.endDate)}
                    </td>

                    <td className="px-4 py-3">
                      <div>{guestLabel(b).main}</div>
                      <div className="text-xs text-muted-foreground">
                        {guestLabel(b).sub}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right font-medium">
                      ₹{b.amount?.toLocaleString("en-IN")}
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
                        <DropdownMenuContent className="bg-white" align="end">
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
        </div>

        {/* MOBILE VIEW */}
        <div className="sm:hidden space-y-3">
          {visible.map((b) => (
            <div
              key={b._id}
              onClick={() => navigate(`/bookings/${b._id}`)}
              className="bg-card border rounded-xl p-4 space-y-2"
            >
              {/* HEADER */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{b.user?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.room?.name}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={b.status} />

                  {/* ACTIONS MENU */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()} // ⛔ stop card click
                        className="p-1 rounded-md hover:bg-muted"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      className="bg-white"
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                </div>
              </div>

              {/* DETAILS */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {dateFmt(b.startDate)} – {dateFmt(b.endDate)}
                </span>

                <span className="flex items-center gap-1">
                  <Moon size={12} />
                  {nightsBetween(b.startDate, b.endDate)} Nights
                </span>

                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {guestLabel(b).main}
                </span>
              </div>

              {/* AMOUNT */}
              <div className="text-right font-medium">
                ₹{b.amount?.toLocaleString("en-IN")}
              </div>
            </div>

          ))}
        </div>

        {/* PAGINATION */}
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
