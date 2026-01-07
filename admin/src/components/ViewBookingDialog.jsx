import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar,
  Users,
  IndianRupee,
  Utensils,
} from "lucide-react";
import { format } from "date-fns";
import { getBookingAdmin } from "@/api/admin";

import { toast } from "sonner";

/* ================= UTILS ================= */

const initials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const fmt = (d) =>
  d ? format(new Date(d), "dd MMM yyyy") : "—";

const nightsBetween = (from, to) => {
  if (!from || !to) return 0;
  const s = new Date(from);
  const e = new Date(to);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((e - s) / 86400000));
};

/* ================= COMPONENT ================= */

export default function ViewBookingDialog({
  open,
  onOpenChange,
  bookingId,
}) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ===== FETCH FULL BOOKING ===== */
  useEffect(() => {
    if (!open || !bookingId) return;

    fetchBooking();
  }, [open, bookingId]);

  const fetchBooking = async () => {
  setLoading(true);
  try {
    const data = await getBookingAdmin(bookingId);
    setBooking(data);
  } catch {
    toast.error("Failed to load booking details");
    onOpenChange(false);
  } finally {
    setLoading(false);
  }
};


  if (!booking || loading) return null;

  /* ================= DATA ================= */

  const userName =
    booking.contactName || booking.user?.name || "Guest";

  const email =
    booking.contactEmail || booking.user?.email || "—";

  const phone =
    booking.contactPhone || booking.user?.phone || "—";

  const joined = booking.user?.createdAt
    ? format(
        new Date(booking.user.createdAt),
        "MMMM dd, yyyy"
      )
    : "—";

  const nights =
    booking.nights ||
    nightsBetween(booking.startDate, booking.endDate);

  /* ================= MEALS (REAL SCHEMA) ================= */

  const hasMeals = booking.withMeal === true;

  const totalMealGuests =
    (booking.vegGuests || 0) +
    (booking.nonVegGuests || 0) +
    (booking.comboGuests || 0);

  const perGuestPerNightMealPrice =
    hasMeals && totalMealGuests > 0
      ? Math.round(
          booking.mealTotal / (totalMealGuests * nights)
        )
      : 0;

  const mealRows = hasMeals
    ? [
        booking.vegGuests > 0 && {
          label: "Veg Meal",
          value: `₹${perGuestPerNightMealPrice} × ${booking.vegGuests} guest(s) × ${nights} night(s)`,
        },
        booking.nonVegGuests > 0 && {
          label: "Non-Veg Meal",
          value: `₹${perGuestPerNightMealPrice} × ${booking.nonVegGuests} guest(s) × ${nights} night(s)`,
        },
        booking.comboGuests > 0 && {
          label: "Combo Meal",
          value: `₹${perGuestPerNightMealPrice} × ${booking.comboGuests} guest(s) × ${nights} night(s)`,
        },
      ].filter(Boolean)
    : [];

  /* ================= UI ================= */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] rounded-2xl p-0 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="text-lg font-semibold">
            Booking Details
          </DialogTitle>
          <DialogDescription className="sr-only">
            Booking, guest, stay duration, meals and payment details
          </DialogDescription>
        </DialogHeader>

        {/* BODY */}
        <div className="px-6 pb-6 space-y-6">
          {/* USER */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-primary font-semibold text-lg">
              {initials(userName)}
            </div>

            <div className="min-w-0">
              <div className="text-lg font-semibold truncate">
                {userName}
              </div>
              <div className="text-sm text-muted-foreground">
                {booking._id}
              </div>
            </div>
          </div>

          {/* CONTACT */}
          <div className="space-y-2 text-sm">
            <InfoRow label="Email" value={email} />
            <InfoRow label="Phone" value={phone} />
            <InfoRow label="Joined" value={joined} />
          </div>

          <div className="h-px bg-border" />

          {/* BOOKING INFO */}
          <div className="space-y-3 text-sm">
            <InfoRow
              label="Room"
              value={booking.room?.name || "Entire Villa"}
            />
            <InfoRow
              label="Dates"
              value={`${fmt(
                booking.startDate
              )} → ${fmt(booking.endDate)}`}
            />

            <InfoIcon
              icon={<Users size={14} />}
              label="Guests"
              value={booking.guests}
            />
            <InfoIcon
              icon={<Calendar size={14} />}
              label="Nights"
              value={nights}
            />
            <InfoIcon
              icon={<IndianRupee size={14} />}
              label="Amount Paid"
              value={`₹${booking.amount.toLocaleString(
                "en-IN"
              )}`}
              bold
            />
          </div>

          {/* MEALS */}
          <div className="h-px bg-border" />
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <Utensils size={16} /> Meals
            </div>

            {hasMeals && mealRows.length > 0 ? (
              <>
                {mealRows.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-muted-foreground">
                      {m.label}
                    </span>
                    <span className="font-medium text-right">
                      {m.value}
                    </span>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-1 font-semibold">
                  <span>Total Meals</span>
                  <span>
                    ₹{booking.mealTotal.toLocaleString(
                      "en-IN"
                    )}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                No meals selected
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          {/* STATS */}
          <div className="grid grid-cols-2 gap-4">
            <StatBox
              label="Payment"
              value={booking.paymentProvider || "—"}
            />
            <StatBox
              label="Status"
              value={booking.status}
              status
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================= SUB COMPONENTS ================= */

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate max-w-[70%]">
        {value || "—"}
      </span>
    </div>
  );
}

function InfoIcon({ icon, label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-2">
        {icon} {label}
      </span>
      <span className={bold ? "font-semibold" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}

function StatBox({ label, value, status }) {
  const statusColor =
    value === "confirmed"
      ? "text-green-600 bg-green-100"
      : value === "cancelled"
      ? "text-red-600 bg-red-100"
      : "text-yellow-600 bg-yellow-100";

  return (
    <div className="rounded-xl p-4 flex flex-col items-center justify-center bg-muted min-h-[84px]">
      <div
        className={`text-sm font-semibold ${
          status ? statusColor : ""
        } px-3 py-1 rounded-full capitalize`}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}
