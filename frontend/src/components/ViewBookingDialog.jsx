import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, Users, IndianRupee, CreditCard } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMediaQuery } from "@/hooks/use-media-query";
import { api } from "../api/http";
import { Wifi, Phone, Mail, Copy } from "lucide-react";

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

  const roomTotal = booking?.roomTotal || 0;
  const mealTotal =
    booking?.mealMeta?.mealTotal ||
    booking?.mealTotal ||
    0;
  const subTotal = roomTotal + mealTotal;

  const discountAmount = Number(
    booking?.discountMeta?.discountAmount || 0
  );

  const discountedSubtotal = Math.max(
    0,
    subTotal - discountAmount
  );

  const cgstAmount = Number(
    booking?.taxBreakup?.cgstAmount ??
    (booking?.totalTax ? booking.totalTax / 2 : 0)
  );

  const sgstAmount = Number(
    booking?.taxBreakup?.sgstAmount ??
    (booking?.totalTax ? booking.totalTax / 2 : 0)
  );

  const cgstPercent =
    booking?.taxBreakup?.cgstPercent ??
    (discountedSubtotal > 0
      ? ((cgstAmount / discountedSubtotal) * 100).toFixed(0)
      : 0);

  const sgstPercent =
    booking?.taxBreakup?.sgstPercent ??
    (discountedSubtotal > 0
      ? ((sgstAmount / discountedSubtotal) * 100).toFixed(0)
      : 0);

  const taxAmount = cgstAmount + sgstAmount;
  const grandTotal = booking?.amount || 0;

  const Container = isDesktop ? Dialog : Drawer;
  const Content = isDesktop ? DialogContent : DrawerContent;

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Password copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (!open) return null;

  return (
    <Container open={open} onOpenChange={onOpenChange} className="gap-0">
      <Content
        className={`
        ${isDesktop ? "max-w-lg rounded-2xl" : "rounded-t-2xl"}
        p-0 overflow-hidden
        [&>button]:text-white
      `}
      >

        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading booking…
          </div>
        ) : !booking ? null : (

          <>
            {/* ================= HEADER ================= */}
            <div className="bg-primary text-white p-5 rounded-t-xl relative">


              <h2 className="text-2xl font-serif font-semibold">
                {booking.room?.name}
              </h2>

              <p className="text-sm opacity-90">
                Booking ID: {booking._id.slice(-6)}
              </p>

              <span className="absolute top-5 right-12 bg-white/20 px-3 py-1 text-xs rounded-full font-semibold">
                CONFIRMED
              </span>
            </div>

            {/* ================= BODY ================= */}
            <div className="p-4 space-y-2 bg-[#f9f7f6] -mt-4">

              {/* GRID CARDS */}
              <div className="grid grid-cols-2 gap-2">

                {/* CHECK-IN */}
                <InfoCard
                  icon={<Calendar className="w-4 h-4" />}
                  title="CHECK-IN → CHECK-OUT"
                  main={`${fmt(booking.startDate)} → ${fmt(booking.endDate)}`}
                  sub={`${calcNights(
                    booking.startDate,
                    booking.endDate
                  )} night(s)`}
                />

                {/* GUESTS */}
                <InfoCard
                  icon={<Users className="w-4 h-4" />}
                  title="GUESTS"
                  main={`${booking.guests} Guests`}
                  sub={`${booking.adults || 0} Adults · ${booking.children || 0
                    } Children`}
                />

                {/* FOOD */}
                <InfoCard
                  icon={"🍽️"}
                  title="FOOD PREFERENCE"
                  main={`Veg: ${booking.vegGuests || 0} · Non-Veg: ${booking.nonVegGuests || 0
                    }`}
                />

                {/* WIFI */}
                <div className="bg-[#f7f3ef] rounded-xl px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">
                    WIFI
                  </p>

                  <p className="font-semibold text-sm">
                    Villa_Repose_5G
                  </p>

                  <div className="flex items-center gap-2 text-sm mt-0">
                    Pass: <b>welcome@123</b>

                    <button
                      onClick={() =>
                        copyToClipboard("welcome@123")
                      }
                    >
                      <Copy className="w-4 h-4 opacity-60" />
                    </button>
                  </div>
                </div>

                {/* HOST */}
                <div className="bg-[#f7f3ef] rounded-xl px-4 py-3 col-span-1">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">
                    HOST
                  </p>

                  <p className="font-semibold text-sm">
                    Sneha Shinde
                  </p>

                  <p className="text-sm text-red-600 mt-1">
                    +91 98200 74617
                  </p>
                </div>

                {/* LOCATION */}
                <div className="bg-[#f7f3ef] rounded-xl px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">
                    VILLA LOCATION
                  </p>

                  <p className="font-semibold text-sm">
                    Kirawali, Karjat, Maharashtra
                  </p>

                  <a
                    href="https://maps.app.goo.gl/qhNFKD37QUUhqGMB7"
                    className="text-red-600 text-sm mt-1 inline-block"
                  >
                    Open in Maps ↗
                  </a>
                </div>
              </div>

              {/* ================= BILLING ================= */}
              <div className="border-t pt-4 space-y-2">

                <p className="text-xs uppercase text-muted-foreground tracking-wide">
                  Billing Details
                </p>


                <Row label="Room Total" value={roomTotal} />
                <Row label="Food Total" value={mealTotal} />
                {discountAmount > 0 && (
                  <Row
                    label="Discount"
                    value={-discountAmount}
                  />
                )}

                {discountAmount > 0 && (
                  <Row
                    label="After Discount"
                    value={discountedSubtotal}
                  />
                )}
                <Row
                  label={`CGST (${cgstPercent}%)`}
                  value={cgstAmount}
                />

                <Row
                  label={`SGST (${sgstPercent}%)`}
                  value={sgstAmount}
                />

                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total</span>
                  <span>
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

            </div>
          </>
        )}

      </Content>
    </Container>
  );
}


const InfoCard = ({ icon, title, main, sub }) => (
  <div className="bg-[#f7f3ef] rounded-xl px-4 py-3">
    <p className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center gap-2">
      {icon} {title}
    </p>
    <p className="font-semibold text-sm">{main}</p>
    {sub && (
      <p className="text-[11px] text-muted-foreground">
        {sub}
      </p>
    )}
  </div>
);

const Row = ({ label, value }) => {
  const isNegative = value < 0;

  return (
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span
        className={
          isNegative
            ? "text-green-600 font-medium"
            : ""
        }
      >
        {isNegative ? "-" : ""}₹
        {Math.abs(value).toLocaleString("en-IN")}
      </span>
    </div>
  );
};


