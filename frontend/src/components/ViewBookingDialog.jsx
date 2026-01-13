import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import {
    Calendar,
    Users,
    IndianRupee,
    CreditCard,
} from "lucide-react";

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
            (new Date(end) - new Date(start)) /
            (1000 * 60 * 60 * 24)
        )
    );

/* ---------------- COMPONENT ---------------- */

export default function ViewBookingDialog({
    open,
    onOpenChange,
    bookingId,
    onCancelled,
}) {
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

    /* ---------------- UI ---------------- */

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="
          p-0
          w-full
          max-w-lg
          sm:rounded-2xl
          overflow-hidden
        "
            >
                {/* SCROLL CONTAINER */}
                <div
                    className="
            max-h-[90vh]
            overflow-y-auto
          "
                >
                    {loading ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            Loading booking…
                        </div>
                    ) : !booking ? null : (
                        <div className="p-6 space-y-6">

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

                            {/* DATES */}
                            {/* <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium">
                    {fmt(booking.startDate)} →{" "}
                    {fmt(booking.endDate)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {calcNights(
                      booking.startDate,
                      booking.endDate
                    )}{" "}
                    night(s)
                  </div>
                </div>
              </div> */}

                            {/* CHECK-IN / CHECK-OUT */}
                            <div className="space-y-2">
                                <div
                                    className="
      inline-flex
      items-center
      gap-2
      px-3
      py-1
      rounded-lg
      bg-muted
      text-muted-foreground
      text-xs
      font-medium
    "
                                >
                                    CHECK-IN – CHECK-OUT
                                </div>

                                <div className="flex items-start gap-3">
                                    <Calendar className="w-5 h-5 text-primary mt-0.5" />
                                    <div>
                                        <div className="font-medium text-base">
                                            {fmt(booking.startDate)} → {fmt(booking.endDate)}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {calcNights(booking.startDate, booking.endDate)} night(s)
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* GUESTS */}
                            <div className="flex items-start gap-3">
                                <Users className="w-5 h-5 text-primary mt-0.5" />
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

                            {/* PRICE BREAKUP */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Room Total</span>
                                    <span>
                                        ₹{booking.roomTotal?.toLocaleString("en-IN")}
                                    </span>
                                </div>

                                {booking.mealTotal > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span>Meal Total</span>
                                        <span>
                                            ₹{booking.mealTotal?.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between font-semibold text-base pt-2">
                                    <span>Total Amount</span>
                                    <span className="flex items-center gap-1">
                                        <IndianRupee className="w-4 h-4" />
                                        {booking.amount?.toLocaleString("en-IN")}
                                    </span>
                                </div>
                            </div>

                            <Separator />

                            {/* PAYMENT */}
                            <div className="flex items-start gap-3 text-sm">
                                <CreditCard className="w-5 h-5 text-primary mt-0.5" />
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
                            {booking.status === "confirmed" &&
                                new Date(booking.startDate) > new Date() && (
                                    <div className="pt-4 flex justify-center">
                                        <Button
                                            onClick={cancelBooking}
                                            disabled={canceling}
                                            className="
                        w-full
                        max-w-xs
                        rounded-xl
                        bg-primary
                        text-primary-foreground
                        hover:bg-primary/90
                      "
                                        >
                                            {canceling
                                                ? "Cancelling..."
                                                : "Cancel Booking"}
                                        </Button>
                                    </div>
                                )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
