import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Pencil,
  User,
  Users,
  Moon,
  IndianRupee,
  Utensils,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { getBookingAdmin, updateBookingAdmin } from "@/api/admin";
import { toast } from "sonner";

/* ================= HELPERS ================= */

const fmt = (d) => (d ? format(new Date(d), "dd MMM yyyy") : "—");

const nightsBetween = (from, to) => {
  if (!from || !to) return 1;
  const s = new Date(from).setHours(0, 0, 0, 0);
  const e = new Date(to).setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((e - s) / 86400000));
};

/* ================= PAGE ================= */

export default function BookingView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ===== LOAD ===== */
  const load = async () => {
    try {
      setLoading(true);
      const data = await getBookingAdmin(id);

      // 👇 INPUT STATE MUST BE STRINGS
      setBooking({
        ...data,
        guests: String(data.guests ?? ""),
        vegGuests: String(data.vegGuests ?? "0"),
        nonVegGuests: String(data.nonVegGuests ?? "0"),
      });
    } catch {
      toast.error("Failed to load booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-10 text-center text-muted-foreground">
          Loading booking…
        </div>
      </AppLayout>
    );
  }

  if (!booking) {
    return (
      <AppLayout>
        <div className="p-10 text-center text-red-500">
          Booking not found
        </div>
      </AppLayout>
    );
  }

  /* ================= DERIVED (SAFE) ================= */

  const nights =
    booking.nights ??
    nightsBetween(booking.startDate, booking.endDate);

  const room = booking.room || {};

  // ✅ SAFE MEAL PRICES (fallback = 0)
  const vegPrice = Number(room.mealPriceVeg ?? 0);
  const nonVegPrice = Number(room.mealPriceNonVeg ?? 0);

  // ✅ CONVERT INPUT STRINGS → NUMBERS
  const totalGuests = Number(booking.guests || 0);
  const vegGuests = Number(booking.vegGuests || 0);
  const nonVegGuests = Number(booking.nonVegGuests || 0);

  const vegTotal = vegGuests * vegPrice * nights;
  const nonVegTotal = nonVegGuests * nonVegPrice * nights;

  const mealTotal = booking.withMeal
    ? vegTotal + nonVegTotal
    : 0;

  const invalidMeals = vegGuests + nonVegGuests > totalGuests;

  /* ================= SAVE ================= */

  const handleSave = async () => {
    if (invalidMeals) {
      toast.error("Meal guests cannot exceed total guests");
      return;
    }

    try {
      await updateBookingAdmin(booking._id, {
        startDate: booking.startDate,
        endDate: booking.endDate,
        guests: totalGuests,
        vegGuests,
        nonVegGuests,
      });

      toast.success("Booking updated");
      setEditing(false);
      load();
    } catch {
      toast.error("Failed to update booking");
    }
  };

  /* ================= UI ================= */

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </Button>

          <Button
            variant="outline"
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil size={14} />
            {editing ? "Cancel Edit" : "Edit Booking"}
          </Button>
        </div>

        {/* HEADER */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <User size={18} />
            {booking.contactName || booking.user?.name || "Guest"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Booking ID: {booking._id}
          </p>
        </div>

        {/* VIEW MODE */}
        {!editing && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-card border rounded-xl p-5 space-y-3">
              <Row label="Room" value={room.name || "—"} />
              <Row
                label="Dates"
                value={`${fmt(booking.startDate)} → ${fmt(
                  booking.endDate
                )}`}
              />
              <IconRow icon={<Users size={14} />} label="Guests" value={totalGuests} />
              <IconRow icon={<Moon size={14} />} label="Nights" value={nights} />
              <IconRow
                icon={<IndianRupee size={14} />}
                label="Final Amount"
                value={`₹${Number(booking.amount).toLocaleString("en-IN")}`}
                bold
              />
            </div>

            <div className="bg-card border rounded-xl p-5 space-y-3">
              <div className="font-semibold flex items-center gap-2">
                <Utensils size={16} /> Meals
              </div>

              {!booking.withMeal && (
                <div className="text-sm text-muted-foreground">
                  No meals selected
                </div>
              )}

              {booking.withMeal && (
                <>
                  {vegGuests > 0 && (
                    <MealRow label="Veg" guests={vegGuests} price={vegPrice} nights={nights} />
                  )}
                  {nonVegGuests > 0 && (
                    <MealRow label="Non-Veg" guests={nonVegGuests} price={nonVegPrice} nights={nights} />
                  )}
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Total Meals</span>
                    <span>₹{mealTotal.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* EDIT MODE */}
        {editing && (
          <div className="bg-muted border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold">Edit Booking</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Total Guests" type="number"
                value={booking.guests}
                onChange={(e) =>
                  setBooking({ ...booking, guests: e.target.value })
                }
              />

              <Input label="Veg Guests" type="number"
                value={booking.vegGuests}
                onChange={(e) =>
                  setBooking({ ...booking, vegGuests: e.target.value })
                }
              />

              <Input label="Non-Veg Guests" type="number"
                value={booking.nonVegGuests}
                onChange={(e) =>
                  setBooking({ ...booking, nonVegGuests: e.target.value })
                }
              />
            </div>

            {invalidMeals && (
              <p className="text-sm text-red-500">
                Meal guests cannot exceed total guests
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={invalidMeals}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/* ================= UI PARTS ================= */

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const IconRow = ({ icon, label, value, bold }) => (
  <div className="flex justify-between text-sm">
    <span className="flex items-center gap-2 text-muted-foreground">
      {icon} {label}
    </span>
    <span className={bold ? "font-semibold" : "font-medium"}>
      {value}
    </span>
  </div>
);

const MealRow = ({ label, guests, price, nights }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">
      {label}: ₹{price} × {guests} × {nights}
    </span>
    <span className="font-medium">
      ₹{(guests * price * nights).toLocaleString("en-IN")}
    </span>
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="space-y-1">
    <label className="text-xs text-muted-foreground">{label}</label>
    <input
      {...props}
      className="w-full border rounded-md px-3 py-2 text-sm"
    />
  </div>
);
