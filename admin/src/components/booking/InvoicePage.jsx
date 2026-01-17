import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation  } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ArrowLeft, Download } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { getBookingAdmin } from "@/api/admin";
import { toast } from "sonner";


const fmt = (d) => (d ? format(new Date(d), "dd MMM yyyy") : "—");


export default function InvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ref = useRef(null);
  const location = useLocation();

  const [booking, setBooking] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getBookingAdmin(id);
        setBooking(data);
      } catch {
        toast.error("Failed to load invoice");
      }
    })();
  }, [id]);

  useEffect(() => {
  if (!booking) return;

  const params = new URLSearchParams(location.search);
  const shouldDownload = params.get("download") === "true";

  if (shouldDownload) {
    setTimeout(() => {
      downloadPDF();
    }, 300);
  }
}, [booking, location.search]);


  const downloadPDF = async () => {
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);
    pdf.save(`Invoice-${booking._id}.pdf`);
  };

  if (!booking) return null;
  

  const nights = booking.nights || 1;

  return (
    <AppLayout>
      <div className="max-w-5xl px-0 py-0">
        {/* top bar */}
        <div className="flex justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft size={14} /> Back to Invoices
          </button>

          <div className="flex gap-2">
            <Button size="lg" onClick={downloadPDF}>
              <Download size={14} /> Download PDF
            </Button>
          </div>
        </div>

        {/* invoice */}
        <div
          ref={ref}
          className="bg-white rounded-2xl border shadow-sm p-6 text-[13px]"
        >
          {/* header */}
          <div className="flex justify-between mb-6">
            <img src="/pdfLogo.png" className="h-14" />
            <h1 className="text-xl font-semibold">Invoice</h1>
          </div>

          {/* address + invoice no */}
          <div className="flex justify-between mb-6">
            <div className="space-y-1">
              <p className="font-semibold text-[16px]">Villa Address:</p>
              <p className="text-[14px]">Villa Gulposh Vidyasagar Properties Pvt Ltd.</p>
              <p className="text-[14px]">Kirawali, Karjat – 410201</p>
              <p className="text-[14px]">stay@villagulposh.com</p>
              <p className="text-[14px]">+91 98200 74617</p>
            </div>

            <div className="text-right">
              <p className="text-muted-foreground text-[16px]">Invoice Number</p>
              <p className="font-semibold text-[14px]">
                INV-{booking._id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>

          {/* guest + stay */}
          <div className="grid grid-cols-[1.2fr_1fr] gap-4 mb-6 border rounded-xl p-3">
            <div>
              <p className="font-semibold mb-1 text-[16px]">Guest Info:</p>
              <p className="text-[14px]">Name: {booking.user?.name}</p>
              <p className="text-[14px]">Phone: {booking.user?.phone}</p>
              <p className="text-[14px]">Email: {booking.user?.email}</p>
            </div>

            <div className="grid grid-cols-3 rounded-lg bg-muted/30 p-3 gap-3">
              <Meta label="Check In">{fmt(booking.startDate)}</Meta>
              <Meta label="Check Out">{fmt(booking.endDate)}</Meta>
              <Meta label="Booking ID">
                INV-{booking._id.slice(-6).toUpperCase()}
              </Meta>
              <Meta label="Nights">{nights}</Meta>
              <Meta label="Rooms">1</Meta>
              <Meta label="Room Type">{booking.room?.name}</Meta>
            </div>
          </div>

          {/* table */}
          <table className="w-full mb-6">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Rate</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              <Row
                label="Room Charges"
                rate={`₹${booking.pricePerNight} × ${nights}`}
                total={booking.roomTotal}
              />
              {booking.vegGuests > 0 && (
                <Row
                  label="Veg Meal"
                  rate={`₹${booking.room?.mealPriceVeg} × ${booking.vegGuests}`}
                  total={
                    booking.room?.mealPriceVeg * booking.vegGuests
                  }
                />
              )}
              {booking.nonVegGuests > 0 && (
                <Row
                  label="Non-Veg Meal"
                  rate={`₹${booking.room?.mealPriceNonVeg} × ${booking.nonVegGuests}`}
                  total={
                    booking.room?.mealPriceNonVeg *
                    booking.nonVegGuests
                  }
                />
              )}
            </tbody>
          </table>

          {/* totals + payment */}
          <div className="grid grid-cols-2 mb-8">
            <div>
              <p className="font-semibold mb-1">Payment Info:</p>
              <p>{booking.user?.name}</p>
              <p>{booking.paymentProvider} – {booking.paymentId}</p>
              <p>Amount: ₹{booking.amount}</p>
            </div>

            <div>
              <Total label="SubTotal" value={booking.amount} />
              <Total label="Tax 12%" value={Math.round(booking.amount * 0.12)} />
              <div className="flex justify-between font-semibold mt-2">
                <span>Grand Total</span>
                <span className="text-[16px]">
                  ₹{Math.round(booking.amount * 1.12).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* signature */}
          <div className="text-right mb-6">
            <p className="italic mb-6">Signature</p>
            <p className="font-semibold">Jhon Donate</p>
            <p className="text-xs text-muted-foreground">Accounts Manager</p>
          </div>

          <div className="border-t pt-3 text-center text-[11px] text-muted-foreground">
            Terms And Condition: Your use of the website constitutes agreement
            to our Privacy Policy.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ---------------- small components ---------------- */

const Meta = ({ label, children }) => (
  <div>
    <p className="text-[14px] text-muted-foreground">{label}</p>
    <p className="font-medium text-[16px]">{children}</p>
  </div>
);

const Row = ({ label, rate, total }) => (
  <tr className="border-t">
    <td className="px-4 py-3 text-[14px]">{label}</td>
    <td className="px-4 py-3 text-[14px]">{rate}</td>
    <td className="px-4 py-3 text-right text-[14px]">
      ₹{total.toLocaleString("en-IN")}
    </td>
  </tr>
);

const Total = ({ label, value }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-muted-foreground">{label}</span>
    <span>₹{value.toLocaleString("en-IN")}</span>
  </div>
);
