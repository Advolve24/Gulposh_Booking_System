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

/* ---------------- PAGE ---------------- */

export default function MyBookings() {
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");

  /* VIEW BOOKING */
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  /* CANCEL FLOW */
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);

  /* ---------------- LOAD BOOKINGS ---------------- */

  const reload = async () => {
    setLoading(true);
    try {
      setItems(await getMyBookings());
    } catch {
      toast.error("Failed to load bookings");
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

  const list =
    tab === "upcoming"
      ? upcoming
      : tab === "past"
      ? past
      : cancelled;

  /* ---------------- ACTIONS ---------------- */

  const openView = (id) => {
    setSelectedBookingId(id);
    setViewOpen(true);
  };

  const openCancel = (id) => {
    setCancelBookingId(id);
    setCancelOpen(true);
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
          {[
            ["upcoming", "Upcoming"],
            ["past", "Past"],
            ["cancelled", "Cancelled"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${
                  tab === key
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
          <p>Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-muted-foreground">No bookings found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((b) => {
              const nights = calcNights(b.startDate, b.endDate);

              return (
                <div
                  key={b._id}
                  onClick={() => openView(b._id)}
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
                      src={b.room?.coverImage || "/placeholder.jpg"}
                      alt={b.room?.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* CONTENT */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-serif text-lg">
                      {b.room?.name}
                    </h3>

                    <div className="text-sm text-muted-foreground">
                      {fmt(b.startDate)} → {fmt(b.endDate)}
                    </div>

                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{nights} Nights</span>
                      <span>{b.guests} Guests</span>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t">
                      <div>
                        <div className="text-xs">Total</div>
                        <div className="text-lg font-semibold">
                          ₹{b.amount}
                        </div>
                      </div>

                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium
                          ${
                            b.status === "cancelled"
                              ? "bg-red-100 text-red-600"
                              : "bg-green-100 text-green-600"
                          }
                        `}
                      >
                        {b.status}
                      </span>
                    </div>

                    {/* CANCEL BUTTON (UPCOMING ONLY) */}
                    {tab === "upcoming" && b.status === "confirmed" && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCancel(b._id);
                        }}
                        className="w-full mt-3 rounded-xl bg-primary text-primary-foreground"
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
