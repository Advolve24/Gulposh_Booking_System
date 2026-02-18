import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyBookings } from "../api/bookings";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Users,
  Eye,
} from "lucide-react";
import ViewBookingDialog from "@/components/ViewBookingDialog";
import CancelBookingFlow from "@/components/CancelBookingFlow";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getMyEnquiries } from "../api/bookings";


const fmt = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const isFuture = (d) => new Date(d) > new Date();

const calcNights = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
};


export default function MyBookings() {
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");

  const [viewOpen, setViewOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [enquiries, setEnquiries] = useState([]);


  const reload = async () => {
    setLoading(true);
    try {
      const [bookingsData, enquiriesData] = await Promise.all([
        getMyBookings(),
        getMyEnquiries(),
      ]);

      setItems(bookingsData);
      setEnquiries(enquiriesData);

    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    reload();
  }, []);

  /* ---------------- FILTERS ---------------- */

  const upcoming = useMemo(
    () => items.filter((b) => isFuture(b.startDate) && b.status !== "cancelled"),
    [items]
  );

  const past = useMemo(
    () => items.filter((b) => !isFuture(b.startDate) && b.status !== "cancelled"),
    [items]
  );

  const cancelled = useMemo(
    () => items.filter((b) => b.status === "cancelled"),
    [items]
  );

  const enquiryList = useMemo(() => enquiries, [enquiries]);

  const list =
    tab === "upcoming"
      ? upcoming
      : tab === "past"
        ? past
        : tab === "cancelled"
          ? cancelled
          : enquiryList;

  const openView = (id) => {
    setSelectedBookingId(id);
    setViewOpen(true);
  };

  const openCancel = (id) => {
    setCancelBookingId(id);
    setCancelOpen(true);
  };

  {b.status === "booked"
  ? "bg-green-100 text-green-700"
  : "bg-amber-100 text-amber-700"}

  /* ---------------- UI ---------------- */

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">

        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-serif font-semibold">
            My Bookings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your journeys and manage your reservations
          </p>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 bg-[#faf6f2] p-2 rounded-xl w-fit">
          {[
            ["upcoming", "Upcoming"],
            ["past", "Past"],
            ["cancelled", "Cancelled"],
            ["enquiries", "Enquiries"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${tab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <p className="text-muted-foreground">Loading…</p>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24">
            {/* ICON */}
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>

            {/* TITLE */}
            <h2 className="font-serif text-xl sm:text-2xl font-semibold">
              {tab === "upcoming" && "No Upcoming Trips"}
              {tab === "past" && "No Past Trips"}
              {tab === "cancelled" && "No Cancelled Bookings"}
              {tab === "enquiries" && "No Enquiries Made"}
            </h2>

            {/* DESCRIPTION */}
            <p className="mt-2 max-w-md text-sm sm:text-base text-muted-foreground">
              {tab === "upcoming" &&
                "You don’t have any upcoming reservations. Ready to plan your next getaway?"}
              {tab === "past" &&
                "You haven’t completed any stays yet. Your past trips will appear here."}
              {tab === "cancelled" &&
                "You don’t have any cancelled bookings at the moment."}
              {tab === "enquiries" &&
                "You haven’t made any enquiries yet. If you have questions about our villas or services, feel free to reach out!"}

            </p>

            {/* CTA (ONLY FOR UPCOMING) */}
            {tab === "upcoming" && (
              <Button
                className="mt-6 rounded-xl px-6 py-5"
                onClick={() => navigate("/")}
              >
                Explore Rooms
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((b) => {
              const isEnquiry = tab === "enquiries";
              const nights = calcNights(b.startDate, b.endDate);

              return (
                <div
                  key={b._id}
                  onClick={() => {
                    if (!isEnquiry) openView(b._id);
                  }}
                  className="
            group
            bg-white
            rounded-2xl
            border
            shadow-sm
            overflow-hidden
            cursor-pointer
            hover:shadow-lg
            transition
          "
                >
                  {/* IMAGE */}
                  <div className="h-40 overflow-hidden">
                    <img
                      src={isEnquiry ? "/EntireVilla.webp" : (b.room?.coverImage || "/placeholder.jpg")}
                      alt={isEnquiry ? "Enquiry" : b.room?.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* CONTENT */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-serif text-lg">
                      {isEnquiry ? "Entire Villa Enquiry" : b.room?.name}
                    </h3>

                    <div className="text-sm text-muted-foreground">
                      {fmt(b.startDate)} → {fmt(b.endDate)}
                    </div>

                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{nights} Nights</span>
                      <span>{b.guests} Guests</span>
                      {isEnquiry && (
                        <span className="font-medium">
                          {b.status === "enquiry" && "Pending Approval"}
                          {b.status === "accepted" && "Approved"}
                          {b.status === "booked" && "Accepted & Booked"}
                          {b.status === "rejected" && "Rejected"}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t">
                      <div>
                        <div className="text-xs">Total</div>
                        <div className="text-lg font-semibold">
                          {isEnquiry ? "Quotation Pending" : `₹${b.amount}`}
                        </div>
                      </div>

                      <span className={`text-xs px-3 py-1 rounded-full font-medium
  ${isEnquiry
                          ? "bg-amber-100 text-amber-700"
                          : b.status === "cancelled"
                            ? "bg-red-100 text-red-600"
                            : "bg-green-100 text-green-600"
                        }
`}>
                        {isEnquiry ? "Enquiry Sent" : b.status}
                      </span>
                    </div>

                    {/* CANCEL BUTTON (UPCOMING ONLY) */}
                    {tab === "upcoming" && b.status === "confirmed" && !isEnquiry && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCancel(b._id);
                        }}
                        className="w-full mt-3 rounded-xl"
                      >
                        Cancel Booking
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* VIEW BOOKING (RESPONSIVE) */}
      <ViewBookingDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        bookingId={selectedBookingId}
        variant={isDesktop ? "dialog" : "drawer"}
      />

      {/* CANCEL FLOW */}
      <CancelBookingFlow
        bookingId={cancelBookingId}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSuccess={reload}
      />
    </>
  );
}
