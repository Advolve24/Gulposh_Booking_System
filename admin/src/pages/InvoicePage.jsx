import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { listBookingsAdmin } from "@/api/admin";
import { toast } from "sonner";

/* ================= HELPERS ================= */

const fmt = (d) => (d ? format(new Date(d), "dd MMM yyyy") : "—");

const nightsBetween = (from, to) => {
  if (!from || !to) return 0;
  const s = new Date(from);
  const e = new Date(to);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((e - s) / 86400000));
};

/* ================= PAGE ================= */

export default function InvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoiceRef = useRef(null);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const data = await listBookingsAdmin();
      const found = data.find((b) => b._id === id);

      if (!found) {
        toast.error("Invoice not found");
        return;
      }
      setBooking(found);
    } catch {
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });

      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;

      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`Invoice-${booking.bookingId || booking._id}.pdf`);
    } catch {
      toast.error("Failed to download invoice");
    }
  };

  if (loading || !booking) return null;

  const nights = nightsBetween(booking.startDate, booking.endDate);

  /* ===== Charges ===== */
  const roomCharge = booking.amount || 0;

  const meals = booking.meals || {}; // optional
  const vegTotal = (meals.vegPrice || 0) * (meals.vegGuests || 0) * nights;
  const nonVegTotal =
    (meals.nonVegPrice || 0) * (meals.nonVegGuests || 0) * nights;
  const comboTotal =
    (meals.comboPrice || 0) * (meals.comboGuests || 0) * nights;

  const subTotal = roomCharge + vegTotal + nonVegTotal + comboTotal;
  const tax = Math.round(subTotal * 0.12);
  const grandTotal = subTotal + tax;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4">
        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download size={14} />
            Download
          </Button>
        </div>

        {/* ================= INVOICE ================= */}
        <div
          ref={invoiceRef}
          className="bg-white border rounded-xl p-4 sm:p-6 space-y-6 text-sm"
        >
          {/* HEADER */}
          <div className="flex gap-3 items-start">
            <div className="h-10 w-10 rounded bg-primary text-white flex items-center justify-center font-semibold">
              V
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base">
                Villa Gulposh Vidyasagar Properties Pvt Ltd.
              </div>
              <div className="text-xs text-muted-foreground">
                Kirawali, Karjat – 410201
              </div>
              <div className="text-xs text-muted-foreground">
                stay@villagulposh.com · +91 98200 74617
              </div>
            </div>
          </div>

          {/* BOOKING SUMMARY */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border rounded-lg p-3 text-xs">
            <Meta label="Check-in">{fmt(booking.startDate)}</Meta>
            <Meta label="Check-out">{fmt(booking.endDate)}</Meta>
            <Meta label="Duration">{nights} Nights</Meta>
            <Meta label="Guests">{booking.guests} Guests</Meta>
            <Meta label="Room" className="sm:col-span-2">
              {booking.room?.name || "Entire Villa"}
            </Meta>
          </div>

          {/* CHARGES TABLE */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">Rate</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>

              <tbody>
                <Row
                  label="Room Charges"
                  rate={`₹${Math.round(roomCharge / nights)} × ${nights} night(s)`}
                  total={roomCharge}
                />

                {vegTotal > 0 && (
                  <Row
                    label="Veg Meal"
                    rate={`₹${meals.vegPrice} × ${meals.vegGuests} guest(s) × ${nights} night(s)`}
                    total={vegTotal}
                  />
                )}

                {nonVegTotal > 0 && (
                  <Row
                    label="Non-Veg Meal"
                    rate={`₹${meals.nonVegPrice} × ${meals.nonVegGuests} guest(s) × ${nights} night(s)`}
                    total={nonVegTotal}
                  />
                )}

                {/* {comboTotal > 0 && (
                  <Row
                    label="Combo Meal"
                    rate={`₹${meals.comboPrice} × ${meals.comboGuests} guest(s) × ${nights} night(s)`}
                    total={comboTotal}
                  />
                )} */}
              </tbody>
            </table>
          </div>

          {/* TOTALS */}
          <div className="max-w-sm ml-auto space-y-2">
            <TotalRow label="SubTotal" value={subTotal} />
            <TotalRow label="Tax 12%" value={tax} />
            <div className="border-t pt-2 flex justify-between font-semibold text-base text-red-600">
              <span>Grand Total</span>
              <span>₹{grandTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ================= SMALL COMPONENTS ================= */

function Meta({ label, children }) {
  return (
    <div>
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );
}

function Row({ label, rate, total }) {
  return (
    <tr className="border-t">
      <td className="px-4 py-2">{label}</td>
      <td className="px-4 py-2 text-muted-foreground">{rate}</td>
      <td className="px-4 py-2 text-right font-medium">
        ₹{total.toLocaleString("en-IN")}
      </td>
    </tr>
  );
}

function TotalRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>₹{value.toLocaleString("en-IN")}</span>
    </div>
  );
}
