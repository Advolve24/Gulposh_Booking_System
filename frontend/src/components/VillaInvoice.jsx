import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

  /* ================= FETCH BOOKING ================= */
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

  /* ================= CALCULATIONS ================= */
  const nights = booking.nights || 1;
  const roomTotal = booking.pricePerNight * nights;

  const vegTotal =
    booking.vegGuests * booking.room?.mealPriceVeg * nights || 0;
  const nonVegTotal =
    booking.nonVegGuests * booking.room?.mealPriceNonVeg * nights || 0;
  const comboTotal =
    booking.comboGuests * booking.room?.mealPriceCombo * nights || 0;

  const mealTotal = vegTotal + nonVegTotal + comboTotal;
  const subTotal = roomTotal + mealTotal;
  const taxPercent = 12;
  const taxAmount = (subTotal * taxPercent) / 100;
  const grandTotal = subTotal + taxAmount;

  /* ================= PDF ================= */
  const generatePDF = async () => {
    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`invoice-${booking._id}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#faf7f4] px-3 md:px-6 py-4 md:py-8">
      <div className="max-w-5xl mx-auto flex gap-6">

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

          {/* INVOICE */}
          <div
            ref={invoiceRef}
            className="bg-white rounded-2xl shadow-lg p-4 md:p-8 space-y-3"
          >
            {/* HEADER */}
            <div className="flex justify-between items-start border-b pb-2 sm:pb-4">
              <img src="/pdfLogo.png" alt="Gulposh" className="h-10 md:h-14" />

              <div className="text-right">
                <h2 className="text-xl md:text-2xl font-serif font-semibold">
                  Invoice
                </h2>

              </div>
            </div>

            {/* HOTEL + META */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

              {/* LEFT – HOTEL ADDRESS (50%) */}
              <div>
                <h4 className="text-[14px] sm:text-[16px] font-semibold mb-1">Villa Address:</h4>
                <p className=" leading-normal">
                  Villa Gulposh Vidyasagar Properties Pvt Ltd.<br />
                  Kirawali, Karjat – 410201<br />
                  stay@villagulposh.com<br />
                  +91 98200 74617
                </p>
              </div>

              {/* RIGHT – INVOICE NUMBER */}
              <div className="md:text-right self-start">
                <p className="text-sm text-muted-foreground">
                  Invoice Number
                </p>
                <p className="text-[12px] sm:text-[14px] font-semibold">
                  INV-{booking._id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>

            {/* GUEST INFO + CHECK-IN BOX */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 border rounded-xl p-2 sm:p-4 text-sm">

              {/* LEFT: GUEST INFO */}
              <div>
                <h4 className="font-semibold mb-2">Guest Info:</h4>
                <p className="leading-relaxed">
                  Name: {booking.contactName || booking.user?.name}<br />
                  Phone: {booking.contactPhone || booking.user?.phone}<br />
                  Email: {booking.contactEmail || booking.user?.email}
                </p>
              </div>

              {/* RIGHT: CHECK-IN / BOOKING DETAILS */}
              <div className="bg-[#faf7f4] rounded-xl p-2 sm:p-4 grid grid-cols-3 gap-3 text-[13px] sm:text-[14px]">
                <div>
                  Check In<br />
                  <b>{format(new Date(booking.startDate), "dd MMM yyyy")}</b>
                </div>

                <div>
                  Check Out<br />
                  <b>{format(new Date(booking.endDate), "dd MMM yyyy")}</b>
                </div>

                <div>
                  Booking ID<br />
                  <b>INV-{booking._id.slice(-6).toUpperCase()}</b>
                </div>

                <div>
                  Nights<br />
                  <b>{nights}</b>
                </div>

                <div>
                  Rooms<br />
                  <b>1</b>
                </div>

                <div>
                  Room Type<br />
                  <b>{booking.room?.name}</b>
                </div>
              </div>
            </div>


            {/* TABLE */}
            <table className="w-full border rounded-xl overflow-hidden text-sm">
              <thead className="bg-[#faf7f4]">
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
                    ₹{booking.pricePerNight} × {nights}
                  </td>
                  <td className="p-3 text-right font-medium">
                    ₹{roomTotal.toLocaleString("en-IN")}
                  </td>
                </tr>

                {vegTotal > 0 && (
                  <tr className="border-t">
                    <td className="p-3">Veg Meal</td>
                    <td className="p-3">
                      ₹{booking.room.mealPriceVeg} × {booking.vegGuests}
                    </td>
                    <td className="p-3 text-right">
                      ₹{vegTotal.toLocaleString("en-IN")}
                    </td>
                  </tr>
                )}

                {nonVegTotal > 0 && (
                  <tr className="border-t">
                    <td className="p-3">Non-Veg Meal</td>
                    <td className="p-3">
                      ₹{booking.room.mealPriceNonVeg} × {booking.nonVegGuests}
                    </td>
                    <td className="p-3 text-right">
                      ₹{nonVegTotal.toLocaleString("en-IN")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* TOTALS */}
            <div className="flex flex-col md:flex-row justify-between gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Payment Info:</h4>
                <p>
                  {booking.user?.name}<br />
                  {booking.paymentProvider} – {booking.paymentId}<br />
                  Amount: ₹{booking.amount}
                </p>
              </div>

              <div className="w-full md:w-64">
                <div className="flex justify-between mb-1">
                  <span>SubTotal</span>
                  <span>₹{subTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Tax {taxPercent}%</span>
                  <span>+ ₹{taxAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold text-[13px] sm:text-[18px]">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* SIGNATURE */}
            <div className="flex justify-end mt-8 text-sm text-right">
              <div>
                <p className="italic">Signature</p>
                <p className="font-semibold mt-1">Jhon Donate</p>
                <p className="text-muted-foreground">Accounts Manager</p>
              </div>
            </div>

            {/* TERMS */}
            <div className="text-center text-xs text-muted-foreground border-t pt-4">
              <b>Terms And Condition:</b><br />
              Your use of the website constitutes agreement to our Privacy Policy.
            </div>
          </div>
        </div>

        {/* ================= DESKTOP STICKY ACTIONS ================= */}
        <div className="hidden md:flex flex-col gap-3 sticky top-24 h-fit">
          <button
            onClick={generatePDF}
            className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>

          <button
            onClick={() => window.print()}
            className="bg-white border px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </button>
        </div>
      </div>

      {/* ================= MOBILE FIXED DOWNLOAD ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-50">
        <button
          onClick={generatePDF}
          className="w-full bg-primary text-white py-3 rounded-xl flex items-center justify-center gap-2"
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
