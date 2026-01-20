import { useEffect, useState } from "react";
import {
  X,
  Calendar,
  Users,
  CreditCard,
  Mail,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import { createPortal } from "react-dom";

const fmt = (d) => format(new Date(d), "dd MMM yyyy");

export default function BookingViewPopup({
  open,
  booking,
  onClose,
  onCancel,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // allow DOM paint before animating
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open || !booking) return null;

  const nights = Math.max(
    1,
    Math.round(
      (new Date(booking.endDate) - new Date(booking.startDate)) /
      86400000
    )
  );

  const isVilla = booking.isVilla;
  const vegPrice = booking.room?.mealPriceVeg || 0;
  const nonVegPrice = booking.room?.mealPriceNonVeg || 0;
  const vegTotal =
    vegPrice * (booking.vegGuests || 0) * nights;
  const nonVegTotal =
    nonVegPrice * (booking.nonVegGuests || 0) * nights;

  const handleClose = () => {
    const isDesktop = window.matchMedia("(min-width: 640px)").matches;

    if (isDesktop) {
      onClose();
    } else {
      setVisible(false);
      setTimeout(onClose, 250);
    }
  };


  return createPortal(
    <>
      {/* BACKDROP */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/40 transition-opacity duration-300
          ${visible ? "opacity-100" : "opacity-0"}
        `}
        onClick={handleClose}
      />

      {/* WRAPPER */}
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={handleClose}>
        {/* DRAWER / MODAL */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`
            w-full sm:max-w-md
            bg-white shadow-xl
            rounded-t-2xl sm:rounded-2xl
            transform transition-transform duration-300 ease-out
            ${visible ? "translate-y-0" : "translate-y-full"}
            sm:translate-y-0
          `}
        >
          {/* HEADER */}
          <div className="relative p-5 border-b">
            {/* mobile drag indicator */}
            <div className="sm:hidden absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-muted" />

            <h2 className="text-xl font-semibold">
              {booking.room?.name || "Villa"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Booking ID: {booking._id.slice(-6)}
            </p>

            <button
              onClick={handleClose}
              className="absolute top-4 right-4 h-8 w-8 rounded-full border flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>

          {/* BODY */}
          <div className="p-5 space-y-3 text-sm max-h-[78vh] overflow-y-auto">
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

                <p className="text-muted-foreground text-xs">
                  Adults: {booking.guests || 1} · Children: 0
                </p>

                {/* Meal info */}
                {(booking.vegGuests || booking.nonVegGuests) && (
                  <div className="text-muted-foreground text-xs space-y-0.5">
                    {/* VILLA → only counts */}
                    {isVilla && (
                      <p>
                        Veg: {booking.vegGuests || 0} · Non-Veg: {booking.nonVegGuests || 0}
                      </p>
                    )}

                    {/* ROOM → per-person price breakdown */}
                    {!isVilla && (
                      <>
                        {booking.vegGuests > 0 && (
                          <p>
                            Veg: ₹{vegPrice} × {booking.vegGuests} × {nights} night(s)
                            {" = "}
                            <b>₹{vegTotal}</b>
                          </p>
                        )}

                        {booking.nonVegGuests > 0 && (
                          <p>
                            Non-Veg: ₹{nonVegPrice} × {booking.nonVegGuests} × {nights} night(s)
                            {" = "}
                            <b>₹{nonVegTotal}</b>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

              </div>
            </div>

            <hr />

            {/* Contact */}
            {/* Email */}
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-muted-foreground" />
              {booking.user?.email ? (
                <a
                  href={`mailto:${booking.user.email}`}
                  className="text-sm text-black hover:underline break-all"
                >
                  {booking.user.email}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            {/* Phone */}
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-muted-foreground" />
              {booking.user?.phone ? (
                <a
                  href={`tel:${booking.user.phone}`}
                  className="text-sm text-black hover:underline"
                >
                  {booking.user.phone}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            <hr />

            {/* Amount */}
            <Row label="Room Total" value={`₹${booking.roomTotal || 0}`} />
            <Row label="Meal Total" value={`₹${booking.mealTotal || 0}`} />
            <Row bold label="Total Amount" value={`₹${booking.amount || 0}`} />

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
