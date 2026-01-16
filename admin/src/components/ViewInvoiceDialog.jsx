import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/api/axios";
import SummaryApi from "@/common/SummaryApi";
import { toast } from "sonner";

/* ================= HELPERS ================= */

const fmt = (d, f = "dd MMM yyyy") =>
  d ? format(new Date(d), f) : "—";

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
  const invoiceRef = useRef(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(
        SummaryApi.ownerGetInvoice.url(id)
      );

      if (res.data?.success) {
        setBooking(res.data.data);
      } else {
        toast.error("Invoice not found");
      }
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
        useCORS: true,
      });

      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;

      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`Invoice-${booking.invoiceNo || booking._id}.pdf`);
    } catch {
      toast.error("Failed to download invoice");
    }
  };

  if (loading) return null;
  if (!booking) return null;

  const nights = nightsBetween(
    booking.startDate,
    booking.endDate
  );

  const ratePerNight =
    nights > 0
      ? Math.round(booking.amount / nights)
      : booking.amount;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6">
        {/* DOWNLOAD BAR */}
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download size={14} />
            Download Invoice
          </Button>
        </div>

        {/* ================= INVOICE ================= */}
      <div
  ref={invoiceRef}
  className="bg-white rounded-2xl shadow-sm border p-8 font-sans text-[13px] leading-[1.45]"
>
  {/* TOP */}
  <div className="flex justify-between items-start mb-6">
    <div className="space-y-1">
      <img src="/gulposh-logo.svg" className="h-9" alt="Gulposh" />
      <p className="text-[11px] text-muted-foreground tracking-wide">
        IN REPOSE
      </p>
    </div>

    <div className="text-right">
      <h1 className="text-xl font-semibold">Invoice</h1>
    </div>
  </div>

  {/* ADDRESS + INVOICE NO */}
  <div className="flex justify-between mb-6">
    <div className="text-sm space-y-1">
      <p className="font-semibold">Villa Address:</p>
      <p>Villa Gulposh Vidyasagar Properties Pvt Ltd.</p>
      <p>Kirawali, Karjat – 410201</p>
      <p>stay@villagulposh.com</p>
      <p>+91 98200 74617</p>
    </div>

    <div className="text-right text-sm">
      <p className="text-muted-foreground">Invoice Number</p>
      <p className="font-semibold">
        INV-{booking._id.slice(-6).toUpperCase()}
      </p>
    </div>
  </div>

  {/* GUEST + STAY CARD */}
  <div className="grid grid-cols-[1.2fr_1fr] gap-4 mb-6 bg-muted/30 rounded-xl p-4">
    <div className="space-y-1">
      <p className="font-semibold">Guest Info:</p>
      <p>Name: {booking.user?.name}</p>
      <p>Phone: {booking.user?.phone}</p>
      <p>Email: {booking.user?.email}</p>
    </div>

    <div className="grid grid-cols-3 gap-3 text-sm">
      <Meta label="Check In">{fmt(booking.startDate)}</Meta>
      <Meta label="Check Out">{fmt(booking.endDate)}</Meta>
      <Meta label="Booking ID">
        INV-{booking._id.slice(-6).toUpperCase()}
      </Meta>

      <Meta label="Nights">{booking.nights}</Meta>
      <Meta label="Rooms">1</Meta>
      <Meta label="Room Type">{booking.room?.name}</Meta>
    </div>
  </div>

  {/* TABLE */}
  <div className="border rounded-xl overflow-hidden mb-6">
    <table className="w-full text-sm">
      <thead className="bg-muted/40">
        <tr>
          <th className="px-4 py-3 text-left font-medium">Description</th>
          <th className="px-4 py-3 text-left font-medium">Rate</th>
          <th className="px-4 py-3 text-right font-medium">Total</th>
        </tr>
      </thead>

      <tbody>
        <Row
          label="Room Charges"
          rate={`₹${booking.pricePerNight} × ${booking.nights}`}
          total={booking.roomTotal}
        />

        {booking.vegGuests > 0 && (
          <Row
            label="Veg Meal"
            rate={`₹${booking.room?.mealPriceVeg} × ${booking.vegGuests}`}
            total={booking.room?.mealPriceVeg * booking.vegGuests}
          />
        )}

        {booking.nonVegGuests > 0 && (
          <Row
            label="Non-Veg Meal"
            rate={`₹${booking.room?.mealPriceNonVeg} × ${booking.nonVegGuests}`}
            total={booking.room?.mealPriceNonVeg * booking.nonVegGuests}
          />
        )}
      </tbody>
    </table>
  </div>

  {/* PAYMENT + TOTAL */}
  <div className="grid grid-cols-2 gap-6 mb-8">
    <div className="space-y-1 text-sm">
      <p className="font-semibold">Payment Info:</p>
      <p>{booking.user?.name}</p>
      <p>
        {booking.paymentProvider} – {booking.paymentId}
      </p>
      <p>Amount: ₹{booking.amount}</p>
    </div>

    <div className="text-sm">
      <TotalRow label="SubTotal" value={booking.amount} />
      <TotalRow label="Tax 12%" value={Math.round(booking.amount * 0.12)} />

      <div className="flex justify-between font-semibold text-base mt-2">
        <span>Grand Total</span>
        <span>
          ₹{(booking.amount * 1.12).toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  </div>

  {/* SIGNATURE */}
  <div className="flex justify-end mb-6">
    <div className="text-right">
      <p className="italic mb-6">Signature</p>
      <p className="font-semibold">Jhon Donate</p>
      <p className="text-xs text-muted-foreground">
        Accounts Manager
      </p>
    </div>
  </div>

  {/* FOOTER */}
  <div className="border-t pt-3 text-center text-[11px] text-muted-foreground">
    Terms And Condition: Your use of the website constitutes agreement
    to our Privacy Policy.
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
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  );
}

function Row({ label, rate, total }) {
  return (
    <tr className="border-t">
      <td className="px-4 py-3">{label}</td>
      <td className="px-4 py-3">{rate}</td>
      <td className="px-4 py-3 text-right">
        ₹{total.toLocaleString("en-IN")}
      </td>
    </tr>
  );
}

function TotalRow({ label, value }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span>₹{value.toLocaleString("en-IN")}</span>
    </div>
  );
}
