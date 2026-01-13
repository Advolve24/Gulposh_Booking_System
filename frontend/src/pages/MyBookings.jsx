import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyBookings, cancelBooking } from "../api/bookings";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
  Calendar,
  Clock,
  Users,
  Eye,
} from "lucide-react";

import ViewBookingDialog from "@/components/booking/ViewBookingDialog";

/* ---------------- HELPERS ---------------- */

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

/* ---------------- EMPTY STATE ---------------- */

function EmptyState({ type, onExplore }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Calendar className="w-8 h-8 text-muted-foreground" />
      </div>

      <h3 className="text-2xl font-serif font-semibold mb-2">
        {type === "upcoming" ? "No Upcoming Trips" : "No Past Trips"}
      </h3>

      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {type === "upcoming"
          ? "You don't have any upcoming reservations. Ready to plan your next getaway?"
          : "You don’t have any past reservations yet."}
      </p>

      {type === "upcoming" && (
        <Button className="rounded-xl px-6" onClick={onExplore}>
          Explore Rooms
        </Button>
      )}
    </div>
  );
}

/* ---------------- PAGE ---------------- */

export default function MyBookings() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");

  /* VIEW BOOKING MODAL */
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  /* ---------------- LOAD BOOKINGS ---------------- */

  const reload = async () => {
    setLoading(true);
    try {
      setItems(await getMyBookings());
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  /* ---------------- FILTERS ---------------- */

  const upcoming = useMemo(
    () => items.filter((b) => isFuture(b.startDate)),
    [items]
  );

  const past = useMemo(
    () => items.filter((b) => !isFuture(b.startDate)),
    [items]
  );

  const list = tab === "upcoming" ? upcoming : past;

  /* ---------------- ACTIONS ---------------- */

  const onCancel = async (id) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      await cancelBooking(id);
      toast.success("Booking cancelled");
      reload();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to cancel booking");
    }
  };

  const openView = (id) => {
    setSelectedBookingId(id);
    setViewOpen(true);
  };

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
          <button
            onClick={() => setTab("upcoming")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
              ${
                tab === "upcoming"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Calendar className="w-4 h-4" />
            Upcoming
          </button>

          <button
            onClick={() => setTab("past")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
              ${
                tab === "past"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Clock className="w-4 h-4" />
            Past
            {past.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/40">
                {past.length}
              </span>
            )}
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <p className="text-sm">Loading…</p>
        ) : list.length === 0 ? (
          <EmptyState type={tab} onExplore={() => navigate("/")} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((b) => {
              const nights = calcNights(b.startDate, b.endDate);

              return (
                <div
                  key={b._id}
                  className="group bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition"
                >
                  {/* IMAGE */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={b.room?.coverImage || "/placeholder.jpg"}
                      alt={b.room?.name}
                      className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                      <div>
                        <h3 className="text-white text-lg font-serif font-semibold">
                          {b.room?.name}
                        </h3>
                        <p className="text-white/80 text-sm">
                          Gulposh Villa
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600/90 text-white">
                        {b.status}
                      </span>
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 text-primary" />
                      {fmt(b.startDate)} → {fmt(b.endDate)}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {nights} Nights
                      </div>

                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {b.guests} Guests
                      </div>
                    </div>

                    <div className="border-t pt-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Total
                        </div>
                        <div className="text-lg font-semibold">
                          ₹{b.amount}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl flex items-center gap-2"
                        onClick={() => openView(b._id)}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </div>

                    {tab === "upcoming" && b.status === "confirmed" && (
                      <div className="pt-3 flex justify-center">
                        <Button
                          onClick={() => onCancel(b._id)}
                          className="w-full max-w-[220px] rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Cancel Booking
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VIEW BOOKING POPUP */}
      <ViewBookingDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        bookingId={selectedBookingId}
        onCancelled={reload}
      />
    </>
  );
}
