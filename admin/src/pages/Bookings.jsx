import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { useSearchParams } from "react-router-dom";
import { MoreHorizontal, Calendar, Users, Moon, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getBookingAdmin } from "@/api/admin";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";
import { listBookingsAdmin } from "@/api/admin";
import BookingViewPopup from "@/components/BookingViewPopup";
import BookingTable from "@/components/BookingTable";
import MobileBookingCard from "@/components/MobileBookingCard";
import EditBookingDialog from "@/components/EditBookingDialog";
import AdminCancelBookingDialog from "@/components/AdminCancelBookingDialog";


const downloadInvoiceDirect = (bookingId) => {
  const toastId = toast.loading("PDF is generating...");

  const url = `${import.meta.env.VITE_API_URL}/invoice/${bookingId}/download`;

  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    toast.success("Invoice downloaded!", { id: toastId });
  }, 2000);
};




export default function Booking() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 8;
  const [params] = useSearchParams();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [search, setSearch] = useState("");
  const [editBooking, setEditBooking] = useState(null);
  const userFilter = params.get("user");
  const [cancelBooking, setCancelBooking] = useState(null);


  const filteredBookings = useMemo(() => {
    let data = bookings;
    if (status !== "all") {
      data = data.filter((b) => b.status === status);
    }
    if (userFilter) {
      data = data.filter(
        (b) => b.user?._id === userFilter
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((b) =>
        b._id.toLowerCase().includes(q) ||
        b.user?.name?.toLowerCase().includes(q) ||
        b.user?.email?.toLowerCase().includes(q) ||
        b.user?.phone?.includes(q)
      );
    }
    return data;
  }, [bookings, status, search, userFilter]);



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
      <div className="w-full md:max-w-7xl space-y-6 py-0">

        {/* FILTER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-start md:justify-between gap-3">
          {/* STATUS FILTER */}
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full md:w-[160px] h-10">
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

          <div className="flex md:w-auto w-full md:flex-row items-center gap-3">
            {/* SEARCH INPUT */}
            <input
              type="text"
              placeholder="Search booking / guest…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
        h-10 w-[83%] md:w-[240px]
        border rounded-lg px-3 text-sm
        focus:outline-none focus:ring-2 focus:ring-primary/30
      "
            />
            {/* REFRESH */}
            <button
              onClick={loadBookings}
              className="h-10 w-[14%] md:w-10 border rounded-lg flex items-center justify-center"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>


        {/* DESKTOP TABLE */}
        <div className="hidden sm:block bg-card border rounded-xl">
          <div className="relative overflow-x-auto">
            <BookingTable
              bookings={visible}
              onRowClick={async (b) => {
                try {
                  const full = await getBookingAdmin(b._id);
                  setSelectedBooking(full);
                } catch {
                  toast.error("Failed to load booking details");
                }
              }}

              onViewInvoice={(b) => navigate(`/bookings/${b._id}/invoice`)}
              onDownloadInvoice={(b) => {
                downloadInvoiceDirect(b._id);
              }}
              onEditBooking={(b) => setEditBooking(b)}
              onCancelBooking={(b) => setCancelBooking(b)}
            />

          </div>
        </div>

        {/* MOBILE VIEW */}
        <div className="sm:hidden space-y-3">
          {visible.map((b) => (
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
              onDownloadInvoice={(b) => {
                downloadInvoiceDirect(b._id);
              }}
              onEditBooking={(b) => setEditBooking(b)}
            />
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

        <BookingViewPopup
          open={!!selectedBooking}
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCancel={(b) => {
            setSelectedBooking(null);
            setCancelBooking(b);
          }}
        />

        <EditBookingDialog
          open={!!editBooking}
          booking={editBooking}
          onOpenChange={() => setEditBooking(null)}
          reload={loadBookings}
        />

        <AdminCancelBookingDialog
          open={!!cancelBooking}
          booking={cancelBooking}
          onClose={() => setCancelBooking(null)}
          onSuccess={loadBookings}
        />

      </div>
    </AppLayout>
  );
}
