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
          className="bg-white border rounded-xl p-6 space-y-6 text-sm"
        >
          {/* HEADER */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">
                {booking.property?.name || "Property"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {booking.property?.address || ""}
              </p>
            </div>

            <div className="text-right">
              <div className="text-base font-semibold">
                TAX INVOICE
              </div>
              <div className="text-xs text-muted-foreground">
                Invoice No:{" "}
                {booking.invoiceNo || booking._id}
              </div>
            </div>
          </div>

          {/* BILL + META */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-4">
            {/* BILL TO */}
            <div className="space-y-1">
              <div className="font-medium">Bill To</div>
              <div>{booking.user?.name || "—"}</div>
              <div>{booking.user?.phone || "—"}</div>
              <div className="text-muted-foreground">
                {booking.user?.email || "—"}
              </div>
            </div>

            {/* META */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Meta label="Invoice Date">
                {fmt(booking.createdAt)}
              </Meta>
              <Meta label="Booking ID">
                {booking.bookingId || booking._id}
              </Meta>
              <Meta label="Order ID">
                {booking._id}
              </Meta>
              <Meta label="Payment ID">
                {booking.paymentId || "—"}
              </Meta>
            </div>
          </div>

          {/* BOOKING DETAILS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border rounded-lg p-4 text-xs">
            <Meta label="Check-in">
              {fmt(booking.startDate)}
            </Meta>
            <Meta label="Check-out">
              {fmt(booking.endDate)}
            </Meta>
            <Meta label="Duration">
              {nights} Nights
            </Meta>
            <Meta label="Guests">
              {booking.guests} Guests
            </Meta>
          </div>

          {/* TABLE */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">
                    Description
                  </th>
                  <th className="px-4 py-2 text-center">
                    Qty
                  </th>
                  <th className="px-4 py-2 text-right">
                    Rate
                  </th>
                  <th className="px-4 py-2 text-right">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-t">
                  <td className="px-4 py-2">1</td>
                  <td className="px-4 py-2">
                    Room / Accommodation Charges
                  </td>
                  <td className="px-4 py-2 text-center">
                    {nights} Nights
                  </td>
                  <td className="px-4 py-2 text-right">
                    ₹{ratePerNight}
                  </td>
                  <td className="px-4 py-2 text-right">
                    ₹
                    {booking.amount.toLocaleString(
                      "en-IN"
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TOTAL */}
          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-2">
              <TotalRow label="Sub Total">
                ₹
                {booking.amount.toLocaleString(
                  "en-IN"
                )}
              </TotalRow>

              <TotalRow label="Tax (0%)">
                ₹0.00
              </TotalRow>

              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Grand Total</span>
                <span>
                  ₹
                  {booking.amount.toLocaleString(
                    "en-IN"
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t">
            <div>
              <div className="font-medium mb-1">
                Payment Information
              </div>
              <div>Status: Paid</div>
              <div>Method: Razorpay</div>
              <div>
                Transaction ID:{" "}
                {booking.paymentId || "—"}
              </div>
            </div>

            <div className="text-right italic">
              Authorised Signature
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground text-center">
            This is a computer-generated invoice and
            does not require a physical signature.
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
      <div className="text-muted-foreground text-[11px]">
        {label}
      </div>
      <div className="font-medium">{children}</div>
    </div>
  );
}

function TotalRow({ label, children }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
}
