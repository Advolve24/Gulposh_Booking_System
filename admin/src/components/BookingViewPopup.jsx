import { useEffect } from "react";
import { X, Calendar, Users, CreditCard, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { createPortal } from "react-dom";

const fmt = (d) => format(new Date(d), "dd MMM yyyy");

export default function BookingViewPopup({ open, booking, onClose, onCancel }) {
  if (!open || !booking) return null;

  const nights = Math.max(
    1,
    Math.round(
      (new Date(booking.endDate) - new Date(booking.startDate)) / 86400000
    )
  );

  return createPortal(
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/40 z-[9998]"
        onClick={onClose}
      />

      {/* MODAL */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
        onClick={onClose}
      >

        <div
          className="bg-white w-full max-w-md rounded-2xl shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="relative p-5 border-b">
            <h2 className="text-xl font-semibold">
              {booking.room?.name || "Villa"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Booking ID: {booking._id.slice(-6)}
            </p>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 h-8 w-8 rounded-full border flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>

          {/* BODY */}
          <div className="p-5 space-y-3 text-sm">
            {/* Dates */}
            <div>
              <span className="inline-block mb-2 text-xs px-3 py-1 bg-muted rounded-full">
                CHECK-IN – CHECK-OUT
              </span>

              <div className="flex items-start gap-3">
                <Calendar size={18} className="mt-1 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {fmt(booking.startDate)} – {fmt(booking.endDate)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {nights} night(s)
                  </p>
                </div>
              </div>
            </div>



            {/* Guests */}
            <div className="flex items-start gap-3">
              <Users size={18} className="mt-1 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {booking.guests || 1} Guests
                </p>
                {booking.withMeal && (
                  <p className="text-muted-foreground text-xs">
                    Veg: {booking.vegGuests || 0} · Non-Veg:{" "}
                    {booking.nonVegGuests || 0}
                  </p>
                )}
              </div>
            </div>

            <hr />

            <div>

              <div className="space-y-2 text-sm">

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail size={14} />
                  <span>{booking.user?.email || "—"}</span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone size={14} />
                  <span>{booking.user?.phone || "—"}</span>
                </div>
              </div>
            </div>

            <hr />

            {/* Amount */}
            <div className="space-y-2">
              <Row label="Room Total" value={`₹${booking.roomTotal?.toLocaleString("en-IN")}`} />
              <Row label="Meal Total" value={`₹${booking.mealTotal?.toLocaleString("en-IN")}`} />
              <Row bold label="Total Amount" value={`₹${booking.amount?.toLocaleString("en-IN")}`} />
            </div>

            <hr />

            {/* Payment */}
            <div className="flex items-start gap-3">
              <CreditCard size={18} className="mt-1 text-muted-foreground" />
              <div>
                <p className="font-medium">Payment via Razorpay</p>
                <p className="text-xs text-muted-foreground">
                  Payment ID: {booking.paymentId || "—"}
                </p>
              </div>
            </div>

            {/* ACTION */}
            {booking.status !== "cancelled" && (
              <button
                onClick={() => onCancel(booking._id)}
                className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium"
              >
                Cancel Booking
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
