import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

import {
  Calendar,
  Users,
  IndianRupee,
  CreditCard,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMediaQuery } from "@/hooks/use-media-query";
import { api } from "../api/http";

/* ---------------- HELPERS ---------------- */

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const calcNights = (start, end) =>
  Math.max(
    1,
    Math.round(
      (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)
    )
  );

/* ---------------- COMPONENT ---------------- */

export default function ViewBookingDialog({
  open,
  onOpenChange,
  bookingId,
  onCancelled,
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);

  /* ---------------- LOAD BOOKING ---------------- */

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

  /* ---------------- CANCEL ---------------- */

  const cancelBooking = async () => {
    if (!confirm("Cancel this booking?")) return;

    try {
      setCanceling(true);
      await api.post(`/bookings/${bookingId}/cancel`);
      toast.success("Booking cancelled");
      onCancelled?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e?.response?.data?.message || "Failed to cancel booking"
      );
    } finally {
      setCanceling(false);
    }
  };

  /* ---------------- CONTAINER SWITCH ---------------- */

  const Container = isDesktop ? Dialog : Drawer;
  const Content = isDesktop ? DialogContent : DrawerContent;

  /* ---------------- UI ---------------- */

  return (
    <Container open={open} onOpenChange={onOpenChange}>
      <Content
        className={`
          ${isDesktop ? "max-w-lg rounded-2xl" : "rounded-t-2xl"}
          p-0
          overflow-hidden
        `}
      >
        {/* SCROLLABLE BODY */}
        <div className="max-h-[85vh] overflow-y-auto p-6 space-y-6">

          {loading ? (
            <div className="text-center text-sm text-muted-foreground">
              Loading booking…
            </div>
          ) : !booking ? null : (
            <>
              {/* HEADER */}
              <div>
                <h2 className="text-xl font-serif font-semibold">
                  {booking.room?.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Booking ID: {booking._id.slice(-6)}
                </p>
              </div>

              <Separator />

              {/* CHECK-IN / CHECK-OUT */}
              <div className="space-y-2">
                <div className="inline-flex px-3 py-1 text-xs rounded-lg bg-muted text-muted-foreground">
                  CHECK-IN – CHECK-OUT
                </div>

                <div className="flex gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <div className="font-medium">
                      {fmt(booking.startDate)} → {fmt(booking.endDate)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {calcNights(
                        booking.startDate,
                        booking.endDate
                      )}{" "}
                      night(s)
                    </div>
                  </div>
                </div>
              </div>

              {/* GUESTS */}
              <div className="flex gap-3">
                <Users className="w-5 h-5 text-primary mt-1" />
                <div>
                  <div className="font-medium">
                    {booking.guests} Guests
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Veg: {booking.vegGuests || 0} · Non-Veg:{" "}
                    {booking.nonVegGuests || 0}
                  </div>
                </div>
              </div>

              <Separator />

              {/* PRICE */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Room Total</span>
                  <span>
                    ₹{booking.roomTotal?.toLocaleString("en-IN")}
                  </span>
                </div>

                {booking.mealTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Meal Total</span>
                    <span>
                      ₹{booking.mealTotal?.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                <div className="flex justify-between font-semibold pt-2">
                  <span>Total Amount</span>
                  <span className="flex items-center gap-1">
                    <IndianRupee className="w-4 h-4" />
                    {booking.amount?.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <Separator />

              {/* PAYMENT */}
              <div className="flex gap-3 text-sm">
                <CreditCard className="w-5 h-5 text-primary mt-1" />
                <div>
                  <div className="font-medium capitalize">
                    Payment via {booking.paymentProvider}
                  </div>
                  <div className="text-muted-foreground break-all">
                    Payment ID: {booking.paymentId}
                  </div>
                </div>
              </div>

              {/* ACTION */}
              {/* {booking.status === "confirmed" &&
                new Date(booking.startDate) > new Date() && (
                  <div className="pt-4">
                    <Button
                      onClick={cancelBooking}
                      disabled={canceling}
                      className="w-full rounded-xl bg-primary text-primary-foreground"
                    >
                      {canceling ? "Cancelling…" : "Cancel Booking"}
                    </Button>
                  </div>
                )} */}
            </>
          )}
        </div>
      </Content>
    </Container>
  );
}
