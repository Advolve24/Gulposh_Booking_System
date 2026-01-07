import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { api } from "../api/http";
import { format } from "date-fns";
import { Download, Printer, ArrowLeft } from "lucide-react";

export default function VillaInvoice() {
  const { id } = useParams();
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
  const generatePDF = async (action = "download") => {
    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      scrollY: -window.scrollY,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    if (action === "print") {
      const blob = pdf.output("bloburl");
      const win = window.open(blob);
      win.onload = () => win.print();
    } else {
      pdf.save(`invoice-${booking._id}.pdf`);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-[#faf7f4] py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">

        {/* LEFT */}
        <div className="flex-1">

          <Link
            to="/invoices"
            className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </Link>

          {/* INVOICE */}
          <div
            ref={invoiceRef}
            className="bg-white rounded-2xl shadow-lg p-8 space-y-6"
          >
            {/* HEADER */}
            <div className="flex justify-between items-start border-b pb-4">
              <img src="/pdfLogo.png" alt="Gulposh" className="h-12" />

              <div className="text-right">
                <h2 className="text-3xl font-serif font-semibold">
                  Invoice
                </h2>
                <p className="text-sm text-muted-foreground">
                  Invoice Number – INV-{booking._id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>

            {/* INFO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Invoma Hotel:</h4>
                <p>
                  Villa Gulposh Vidyasagar<br />
                  Properties Pvt Ltd.<br />
                  Kirawali, Karjat – 410201<br />
                  stay@villagulposh.com<br />
                  +91 98200 74617
                </p>
              </div>

              <div className="md:col-span-2 bg-[#faf7f4] rounded-xl p-4 grid grid-cols-3 gap-4">
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

            {/* GUEST + SERVICE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-xl p-4">
              <div>
                <h4 className="font-semibold mb-2">Guest Info:</h4>
                <p>
                  Name: {booking.contactName || booking.user?.name}<br />
                  Phone: {booking.contactPhone || booking.user?.phone}<br />
                  Email: {booking.contactEmail || booking.user?.email}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">
                  Room And Service Details:
                </h4>
                <p className="text-muted-foreground">
                  Room service enables guests to choose food and drinks delivered
                  directly to their room.
                </p>
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
                    ₹{booking.pricePerNight} × {nights} night(s)
                  </td>
                  <td className="p-3 text-right font-medium">
                    ₹{roomTotal.toLocaleString("en-IN")}
                  </td>
                </tr>

                {vegTotal > 0 && (
                  <tr className="border-t">
                    <td className="p-3">Veg Meal</td>
                    <td className="p-3">
                      ₹{booking.room.mealPriceVeg} × {booking.vegGuests} guest(s)
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
                      ₹{booking.room.mealPriceNonVeg} × {booking.nonVegGuests} guest(s)
                    </td>
                    <td className="p-3 text-right">
                      ₹{nonVegTotal.toLocaleString("en-IN")}
                    </td>
                  </tr>
                )}

                {comboTotal > 0 && (
                  <tr className="border-t">
                    <td className="p-3">Combo Meal</td>
                    <td className="p-3">
                      ₹{booking.room.mealPriceCombo} × {booking.comboGuests} guest(s)
                    </td>
                    <td className="p-3 text-right">
                      ₹{comboTotal.toLocaleString("en-IN")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* TOTALS */}
            <div className="flex justify-between mt-6">
              <div className="text-sm">
                <h4 className="font-semibold mb-2">Payment Info:</h4>
                <p>
                  {booking.user?.name}<br />
                  {booking.paymentProvider || "Online"} – {booking.paymentId}<br />
                  Amount: ₹{booking.amount}
                </p>
              </div>

              <div className="text-sm w-64">
                <div className="flex justify-between mb-1">
                  <span>SubTotal</span>
                  <span>₹{subTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Tax {taxPercent}%</span>
                  <span>+ ₹{taxAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg text-primary">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* SIGN */}
            <div className="text-center mt-10">
              <p className="italic">Signature</p>
              <p className="font-semibold mt-2">Jhon Donate</p>
              <p className="text-sm text-muted-foreground">
                Accounts Manager
              </p>
            </div>

            {/* TERMS */}
            <div className="text-center text-xs text-muted-foreground mt-6 border-t pt-4">
              <b>Terms And Condition:</b><br />
              Your use of the website constitutes agreement to our Privacy Policy.
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="w-full lg:w-60 flex flex-col gap-3">
          <button
            onClick={() => generatePDF("download")}
            className="bg-primary text-white py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>

          <button
            onClick={() => generatePDF("print")}
            className="bg-white border py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </button>
        </div>
      </div>
    </div>
  );
}
