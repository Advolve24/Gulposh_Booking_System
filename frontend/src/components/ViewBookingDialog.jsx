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

  const hostPhoneRaw = "+919820074617";
  const hostPhoneDisplay = "+91 98200 74617";

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
            <div className="bg-primary text-white p-5 rounded-t-lg relative">


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

                  <div className="mt-2 flex flex-col gap-2">

                    {/* CALL */}
                    <a
                      href={`tel:${hostPhoneRaw}`}
                      className="flex items-center gap-2 text-red-600 font-medium hover:underline"
                    >
                      <Phone className="w-4 h-4" />
                      {hostPhoneDisplay}
                    </a>

                    {/* WHATSAPP */}
                    <a
                      href={`https://wa.me/${hostPhoneRaw.replace("+", "")}?text=Hi%20I%20have%20a%20booking%20at%20Gulposh%20Villa`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-green-600 font-medium hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      Chat on WhatsApp
                    </a>

                  </div>
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

                <div className="mt-3 rounded-xl overflow-hidden border bg-white">

                  {/* HEADER */}
                  <div className="grid grid-cols-6 text-[11px] font-semibold uppercase bg-[#f3f0ed] text-[#6b5f57] px-3 py-2">
                    <div className="text-left">Room</div>
                    <div className="text-left">Food</div>
                    <div className="text-left">Discount</div>
                    <div className="text-left">After Disc</div>
                    <div className="text-left">CGST{cgstPercent}%</div>
                    <div className="text-left">SGST{sgstPercent}%</div>
                  </div>

                  {/* VALUES */}
                  <div className="grid grid-cols-6 text-sm px-3 py-3 font-medium">
                    <div>₹{roomTotal.toLocaleString("en-IN")}</div>

                    <div>₹{mealTotal.toLocaleString("en-IN")}</div>

                    <div className="text-green-600">
                      -₹{discountAmount.toLocaleString("en-IN")}
                    </div>

                    <div>₹{discountedSubtotal.toLocaleString("en-IN")}</div>

                    <div>
                      ₹{Math.round(cgstAmount).toLocaleString("en-IN")}
                    </div>

                    <div>
                      ₹{Math.round(sgstAmount).toLocaleString("en-IN")}
                      <span className="block text-[10px] text-muted-foreground">
                        {sgstPercent}%
                      </span>
                    </div>
                  </div>

                  {/* DIVIDER */}
                  <div className="border-t" />

                  {/* GRAND TOTAL */}
                  <div className="flex justify-between items-center px-4 py-3 text-lg font-bold">
                    <span className="tracking-wide">Grand Total</span>
                    <span className="text-primary">
                      ₹{Math.round(grandTotal).toLocaleString("en-IN")}
                    </span>
                  </div>
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


