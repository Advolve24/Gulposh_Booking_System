import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { api } from "../api/http";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Calendar,
  Users,
  IndianRupee,
  CreditCard,
  XCircle,
} from "lucide-react";

/* ===============================
   STATUS BADGE
================================ */
const StatusBadge = ({ status }) => {
  const map = {
    confirmed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-700",
  };

  return (
    <Badge className={map[status] || "bg-muted text-muted-foreground"}>
      {status?.toUpperCase()}
    </Badge>
  );
};

/* ===============================
   VIEW BOOKING DIALOG
================================ */
export default function ViewBookingDialog({
  open,
  onOpenChange,
  bookingId,
  onCancelled,
}) {
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);

  /* ================= LOAD BOOKING ================= */
  useEffect(() => {
    if (!open || !bookingId) return;

    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/bookings/${bookingId}`);
        setBooking(data);
      } catch {
        toast.error("Failed to load booking");
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, bookingId, onOpenChange]);

  /* ================= CANCEL ================= */
  const cancelBooking = async () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      toast.success("Booking cancelled");
      setBooking((b) => ({ ...b, status: "cancelled" }));
      onCancelled?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Cancel failed");
    }
  };

  /* ================= UI ================= */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        {loading || !booking ? (
          <div className="p-10 text-center text-muted-foreground">
            Loading booking…
          </div>
        ) : (
          <>
            {/* ================= HEADER ================= */}
            <DialogHeader className="px-6 pt-6">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold">
                  Booking Details
                </DialogTitle>
                <StatusBadge status={booking.status} />
              </div>
            </DialogHeader>

            {/* ================= ROOM IMAGE ================= */}
            <div className="relative h-52 sm:h-64">
              <img
                src={booking.room?.coverImage}
                alt={booking.room?.name}
                className="h-full w-full object-cover"
              />
            </div>

            {/* ================= CONTENT ================= */}
            <div className="px-6 py-6 space-y-6">

              {/* ROOM INFO */}
              <div>
                <h3 className="text-lg font-semibold">
                  {booking.room?.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {booking.room?.description}
                </p>
              </div>

              <Separator />

              {/* DATES + GUESTS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">
                      {format(new Date(booking.startDate), "dd MMM yyyy")} –{" "}
                      {format(new Date(booking.endDate), "dd MMM yyyy")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {booking.nights} night(s)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">
                      {booking.guests} Guests
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Veg: {booking.vegGuests || 0} · Non-Veg:{" "}
                      {booking.nonVegGuests || 0}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* PRICE BREAKUP */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Room Total</span>
                  <span>₹{booking.roomTotal?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Meal Total</span>
                  <span>₹{booking.mealTotal?.toLocaleString("en-IN")}</span>
                </div>

                <Separator />

                <div className="flex justify-between font-semibold text-base">
                  <span>Total Amount</span>
                  <span className="flex items-center gap-1">
                    <IndianRupee className="w-4 h-4" />
                    {booking.amount?.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <Separator />

              {/* PAYMENT */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                <div>
                  Payment via {booking.paymentProvider || "—"}
                  <div className="text-xs">
                    Payment ID: {booking.paymentId || "—"}
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              {booking.status !== "cancelled" && (
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={cancelBooking}
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Booking
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
