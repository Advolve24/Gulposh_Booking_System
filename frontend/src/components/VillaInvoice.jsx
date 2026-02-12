import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { api } from "../api/http";
import { format } from "date-fns";
import { Download, Printer, ArrowLeft } from "lucide-react";


export default function VillaInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const invoiceRef = useRef(null);
  const [searchParams] = useSearchParams();
  const isDownloadingRef = useRef(false);
  const autoDownload = searchParams.get("download") === "1";



  useEffect(() => {
    if (!booking || !autoDownload) return;
    if (isDownloadingRef.current) return;

    isDownloadingRef.current = true;

    const timer = setTimeout(() => {
      generatePDF();
    }, 800);

    return () => clearTimeout(timer);
  }, [booking, autoDownload]);



  useEffect(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => setBooking(res.data))
      .catch(() => setBooking(null));
  }, [id]);

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading invoice…
      </div>
    );
  }


  const nights = booking.nights || 1;

  const roomTotal = booking.roomTotal || 0;
  const mealTotal = booking.mealMeta?.mealTotal || booking.mealTotal || 0;

  const subTotal = roomTotal + mealTotal;

  const taxAmount = booking.totalTax || 0;

  const taxPercent =
    subTotal > 0
      ? ((taxAmount / subTotal) * 100).toFixed(0)
      : 0;

  const vegTotal =
    booking.vegGuests &&
      booking.room?.mealPriceVeg &&
      booking.mealTotal
      ? booking.vegGuests * booking.room.mealPriceVeg * nights
      : 0;

  const nonVegTotal =
    booking.nonVegGuests &&
      booking.room?.mealPriceNonVeg &&
      booking.mealTotal
      ? booking.nonVegGuests * booking.room.mealPriceNonVeg * nights
      : 0;

  const mealDisplayText =
    booking.room?.mealMode === "only"
      ? "Included in room charges"
      : `Veg ₹${vegTotal.toLocaleString("en-IN")} • Non-Veg ₹${nonVegTotal.toLocaleString("en-IN")}`;

  const grandTotal = booking.amount || 0;

  const isMealNotSelected =
    booking.room?.mealMode !== "only" &&
    mealTotal === 0 &&
    !booking.vegGuests &&
    !booking.nonVegGuests;


  const generatePDF = async (isAuto = false) => {
    if (isDownloadingRef.current) return;
    isDownloadingRef.current = true;

    const original = invoiceRef.current;
    if (!original) {
      isDownloadingRef.current = false;
      return;
    }

    let clone;

    try {
      clone = original.cloneNode(true);

      clone.style.width = "1024px";
      clone.style.position = "fixed";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.background = "#ffffff";
      clone.style.padding = "30px";

      document.body.appendChild(clone);

      const images = clone.querySelectorAll("img");
      await Promise.all(
        [...images].map(
          (img) =>
            img.complete ||
            new Promise((res) => {
              img.onload = res;
              img.onerror = res;
            })
        )
      );

      await new Promise((r) => setTimeout(r, 200));

      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 1024,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = (canvas.height * pageWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
      pdf.save(`Villa-Gulposh-Invoice-${booking._id.slice(-6)}.pdf`);

      if (isAuto) {
        setTimeout(() => {
          window.close();
        }, 300);
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      if (clone) document.body.removeChild(clone);
      isDownloadingRef.current = false;
    }
  };


  return (
    <div className="min-h-screen bg-[#faf7f4] px-3 md:px-6 py-4 md:py-8">
      <div className="max-w-6xl mx-auto flex gap-6">

        {/* ================= MAIN ================= */}
        <div className="flex-1">
          {/* BACK */}
          <button
            onClick={() => navigate("/invoices")}
            className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </button>

          <div
            ref={invoiceRef}
            className="invoice-page bg-white shadow-xl rounded-lg max-w-[900px] mx-auto p-8 text-[14px] leading-relaxed"
          >
            {/* HEADER */}
            <div className="flex justify-between items-start border-b pb-4">
              <img src="/pdfLogo.png" alt="logo" className="h-16 mt-2" />

              <div className="text-right">
                <h1 className="text-3xl font-serif font-semibold">Invoice</h1>
                <p className="text-sm text-gray-500 mt-1">Invoice Number</p>
                <p className="font-semibold">
                  INV-{booking._id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>

            {/* FROM / BILL TO */}
            <div className="grid grid-cols-2 gap-8 mt-6">
              <div>
                <p className="text-red-600 font-semibold uppercase text-xs mb-1">
                  From
                </p>
                <p className="font-semibold">
                  Villa Gulposh Vidyasagar Properties Pvt Ltd.
                </p>
                <p>
                  Kirawali, Karjat – 410201<br />
                  stay@villagulposh.com<br />
                  +91 98200 74617
                </p>
              </div>

              <div className="text-right">
                <p className="text-red-600 font-semibold uppercase text-xs mb-1">
                  Bill To
                </p>
                <p className="font-semibold">
                  {booking.contactName || booking.user?.name}
                </p>
                <p>
                  {booking.contactPhone || booking.user?.phone}
                  <br />
                  {booking.contactEmail || booking.user?.email}
                </p>
              </div>
            </div>

            {/* BOOKING DETAILS */}
            <div className="mt-6 border rounded-lg overflow-hidden">
              <div className="bg-primary text-white px-4 py-2 font-semibold uppercase text-sm">
                Booking Details
              </div>

              <div className="grid grid-cols-6 text-center divide-x">
                <div className="p-3">
                  <p className="text-gray-500 text-xs">Check In</p>
                  <p className="font-semibold">
                    {format(new Date(booking.startDate), "dd MMM yy")}
                  </p>
                </div>

                <div className="p-3">
                  <p className="text-gray-500 text-xs">Check Out</p>
                  <p className="font-semibold">
                    {format(new Date(booking.endDate), "dd MMM yy")}
                  </p>
                </div>

                <div className="p-3">
                  <p className="text-gray-500 text-xs">Nights</p>
                  <p className="font-semibold">{nights}</p>
                </div>

                <div className="p-3">
                  <p className="text-gray-500 text-xs">Guests</p>
                  <p className="font-semibold">{booking.guests}</p>
                  <span>{booking.adults} <span className="text-[11px]"> Adults,</span> {booking.children}<span className="text-[11px]"> Children</span></span>
                </div>

                <div className="p-3">
                  <p className="text-gray-500 text-xs">Room Type</p>
                  <p className="font-semibold">{booking.room?.name}</p>
                </div>

                <div className="p-3">
                  <p className="text-gray-500 text-xs">Booking ID</p>
                  <p className="font-semibold">
                    INV-{booking._id.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* ITEM TABLE */}
            <table className="w-full mt-6 border rounded-lg overflow-hidden">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">Rate</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-t">
                  <td className="p-3">Room Charges</td>
                  <td className="p-3">
                    ₹{booking.pricePerNight.toLocaleString("en-IN")} X {nights} nights
                  </td>
                  <td className="p-3 text-right">
                    ₹{roomTotal.toLocaleString("en-IN")}
                  </td>
                </tr>

                {mealTotal > 0 && (
                  <tr className="border-t">
                    <td className="p-3">Veg Total</td>
                    <td className="p-3">₹{booking.room?.mealPriceVeg || 0} x {booking.vegGuests || 0} Guests x {nights} nights</td>
                    <td className="p-3 text-right">
                      ₹{vegTotal.toLocaleString("en-IN")}
                    </td>
                  </tr>
                )}

                {mealTotal > 0 && (
                  <tr className="border-t">
                    <td className="p-3">Non-Veg Total</td>
                    <td className="p-3">₹{booking.room?.mealPriceNonVeg || 0} x {booking.nonVegGuests || 0} Guests x {nights} nights</td>
                    <td className="p-3 text-right">
                      ₹{nonVegTotal.toLocaleString("en-IN")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* PAYMENT + TOTALS */}
            <div className="grid grid-cols-2 gap-8 mt-6">
              <div>
                <p className="text-red-600 font-semibold uppercase text-xs mb-2">
                  Payment Info
                </p>
                <p>
                  Name: {booking.contactName}
                  <br />
                  Mode: {booking.paymentProvider}
                  <br />
                  Payment ID: {booking.paymentId}
                  <br />
                  Status: <span className="text-green-600 font-semibold">Paid</span>
                </p>
              </div>

              <div className="text-right space-y-1">
                <div className="flex justify-between">
                  <span>Room Charges</span>
                  <span>₹{roomTotal.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-between">
                  <span>Meal Total</span>
                  <span>
                    {mealTotal > 0
                      ? `₹${mealTotal.toLocaleString("en-IN")}`
                      : "₹0"}
                  </span>
                </div>

                <div className="flex justify-between border-t pt-1">
                  <span>Subtotal</span>
                  <span>₹{subTotal.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-between">
                  <span>GST ({taxPercent}%)</span>
                  <span>+ ₹{taxAmount.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-between border-t pt-2 text-xl font-bold text-red-600">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* SIGNATURE */}
            <div className="mt-auto">
            <div className="text-right">
              <p className="font-semibold">Sneha Shinde</p>
              <p className="text-gray-500 text-sm">Manager</p>
            </div>

            {/* TERMS */}
            <div className="text-center text-xs text-gray-500 border-t pt-4 mt-12">
              <p className="text-red-600 font-semibold uppercase mb-1">
                Terms and Conditions
              </p>
              Your use of the website constitutes agreement to our Privacy Policy.
            </div>
            </div>
          </div>

        </div>

        {/* ================= DESKTOP STICKY ACTIONS ================= */}
        <div className="hidden md:flex flex-col gap-3 sticky top-24 h-fit">
          <button
            disabled={autoDownload}
            onClick={generatePDF}
            className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* ================= MOBILE FIXED DOWNLOAD ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-50">
        <button
          disabled={autoDownload}
          onClick={generatePDF}
          className="w-full bg-primary text-white py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>

      </div>

      {/* MOBILE SPACER */}
      <div className="md:hidden h-24" />
    </div>
  );
}
