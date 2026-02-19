import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { api } from "../api/http";
import { format } from "date-fns";
import { Download, Printer, ArrowLeft } from "lucide-react";
import { toWords } from "number-to-words";


const convertNumberToWords = (num) => {
  const words = toWords(num);
  return `Rupees ${words.charAt(0).toUpperCase() + words.slice(1)}`;
};


const getShortId = (id = "") => id.slice(-6).toUpperCase();
const formatBookingId = (id = "") => `BK-${getShortId(id)}`;
const formatInvoiceNo = (id = "") => `VG-INV-${getShortId(id)}`;

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
  const vegGuests = booking.vegGuests || 0;
  const nonVegGuests = booking.nonVegGuests || 0;

  const vegPrice = booking.room?.mealPriceVeg || 0;
  const nonVegPrice = booking.room?.mealPriceNonVeg || 0;

  const mealTotal =
    nights * (
      vegGuests * vegPrice +
      nonVegGuests * nonVegPrice
    );

  const hasMeals = vegGuests > 0 || nonVegGuests > 0;


  const subTotal = roomTotal + mealTotal;

  const discountAmount = Number(
    booking.discountMeta?.discountAmount || 0
  );

  const discountedSubtotal = Math.max(
    0,
    subTotal - discountAmount
  );

  const cgstAmount = booking.taxBreakup?.cgstAmount || 0;
  const sgstAmount = booking.taxBreakup?.sgstAmount || 0;
  const taxAmount = cgstAmount + sgstAmount;

  const taxPercent =
    discountedSubtotal > 0
      ? ((taxAmount / discountedSubtotal) * 100).toFixed(0)
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

  const mealMode = booking.room?.mealMode;

  const guestAddressLine = booking.address || "";
  const guestCity = booking.city || "";
  const guestState = booking.state || "";
  const guestCountry = booking.country || "";
  const guestPincode = booking.pincode || "";

  const guestLocationLine = [
    guestCity,
    guestState,
    guestPincode
  ].filter(Boolean).join(", ");

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

  const foodParts = [];
  if (vegGuests > 0) {
    foodParts.push(
      `Veg (${vegGuests} × ₹${vegPrice.toLocaleString("en-IN")})`
    );
  }
  if (nonVegGuests > 0) {
    foodParts.push(
      `Non-Veg (${nonVegGuests} × ₹${nonVegPrice.toLocaleString("en-IN")})`
    );
  }
  const foodBreakdownText = foodParts.join(" + ");


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
            className="bg-white rounded-2xl p-8 text-[14px] leading-relaxed max-w-[900px] mx-auto"
          >
            {/* ================= HEADER ================= */}
            <div className="flex justify-between items-start border-b pb-3">
              <div className="flex gap-4 items-center">
                <img src="/logo1.png" className="w-18 h-14 bg-white rounded-lg p-2 border" />
                <div>
                  <p className="font-bold text-[22px]">Villa Gulposh</p>
                  <p className="text-gray-600 text-sm">
                    A unit of <span className="font-semibold">Vidyasagar Properties Private Limited</span>
                  </p>
                  <p className="text-gray-600 text-sm">
                    GSTIN: <span className="font-semibold">27AABCV3237E2Z1</span>
                  </p>
                </div>
              </div>

              <div className="text-right min-w-[260px]">

                {/* TAX INVOICE badge */}
                <div className="flex justify-end mb-2">
                  <span className="bg-red-100 text-primary px-3 py-2 rounded-full text-xs font-semibold tracking-wide">
                    TAX INVOICE
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0 text-[14px]">

                  <span className="text-gray-600 text-sm">Invoice No</span>
                  <span className="font-bold text-gray-900 text-right text-[12px]">
                    {formatInvoiceNo(booking._id)}
                  </span>

                  <span className="text-gray-600 text-sm">Invoice Date</span>
                  <span className="font-bold text-gray-900 text-right text-[12px]">
                    {format(new Date(), "dd MMM yyyy")}
                  </span>

                  <span className="text-gray-600 text-sm">Booking ID</span>
                  <span className="font-bold text-gray-900 text-right text-[12px]">
                    {formatBookingId(booking._id)}
                  </span>

                </div>
              </div>
            </div>

            {/* ================= SELLER + BILL ================= */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="border rounded-xl p-4">

                <p className="font-bold">
                  Vidyasagar Properties Private Limited<br></br>
                  <span className="font-[300]">Trade name: Villa Gulposh</span>
                </p>

                <p className="text-gray-600 text-sm mt-2">
                  Ground Floor, Belle View
                  <br />
                  L Napo Road, Dadar East
                  <br />
                  Mumbai, Maharashtra - 400014
                </p>

                <p className="text-sm mt-2">
                  GSTIN: <span className="font-semibold">27AABCV3237E2Z1</span>
                </p>
              </div>

              <div className="border rounded-xl p-4">
                <p className="font-bold text-sm mb-2">BILL TO</p>

                <p className="font-bold">
                  {booking.contactName}
                </p>

                <p className="text-gray-600 text-sm mt-1">
                  Email: {booking.contactEmail}
                  <br />
                  Phone: {booking.contactPhone}
                </p>

                {(guestAddressLine || guestLocationLine) && (
                  <p className="text-gray-600 text-sm mt-3 leading-relaxed">
                    {guestAddressLine && (
                      <>
                        {guestAddressLine}
                        <br />
                      </>
                    )}

                    {guestLocationLine && (
                      <>
                        {guestLocationLine}
                        <br />
                      </>
                    )}

                    {guestCountry}
                  </p>
                )}

              </div>

            </div>

            {/* ================= STAY DETAILS ================= */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mt-3 text-[14px]">

              <p className="font-bold text-gray-800 mb-2 uppercase tracking-wide">
                Stay Details
              </p>

              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-6 py-2 pb-4 border-b border-dashed border-gray-300">

                <div className="flex justify-between">
                  <span className="text-gray-600">Property</span>
                  <span className="font-bold text-gray-900">
                    {booking.room?.name}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Nights</span>
                  <span className="font-bold text-gray-900">
                    {nights}
                  </span>
                </div>

              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-2 gap-6 py-2 pb-4 border-b border-dashed border-gray-300">

                <div className="flex justify-between">
                  <span className="text-gray-600">Check-in</span>
                  <span className="font-bold text-gray-900">
                    {format(new Date(booking.startDate), "dd MMM yyyy • hh:mm a")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Guests</span>
                  <span className="font-bold text-gray-900">
                    Adults {booking.adults}, Children {booking.children}
                  </span>
                </div>

              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-2 gap-6 py-2">

                <div className="flex justify-between">
                  <span className="text-gray-600">Check-out</span>
                  <span className="font-bold text-gray-900">
                    {format(new Date(booking.endDate), "dd MMM yyyy • hh:mm a")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">SAC</span>
                  <span className="font-bold text-gray-900">
                    996311 (Accommodation Services)
                  </span>
                </div>

              </div>

            </div>

            {/* ================= ITEMS TABLE ================= */}
            <div className="mt-3 border border-gray-200 rounded-2xl overflow-hidden">

              <table className="w-full text-[14px]">

                {/* HEADER */}
                <thead className="bg-[#f3f4f6] text-gray-600">
                  <tr>
                    <th className="py-2 px-4 text-left font-semibold">Description</th>
                    <th className="py-2 px-4 text-left font-semibold">HSN/SAC</th>
                    <th className="py-2 px-4 text-right font-semibold">Qty</th>
                    <th className="py-2 px-4 text-right font-semibold">Rate</th>
                    <th className="py-2 px-4 text-right font-semibold">Amount</th>
                  </tr>
                </thead>

                <tbody>

                  {/* ================= ROOM ================= */}
                  <tr className="border-t border-gray-200">

                    <td className="py-2 px-4 pb-4">

                      <div className="font-bold text-gray-900">
                        Accommodation Charges
                      </div>

                      <div className="text-gray-500 text-sm ">
                        Room tariff (per night)
                      </div>

                    </td>

                    <td className="p-4">996311</td>

                    <td className="p-4 text-right">1</td>

                    <td className="p-4 text-right">
                      ₹{roomTotal.toLocaleString("en-IN")}
                    </td>

                    <td className="p-4 text-right font-semibold">
                      ₹{roomTotal.toLocaleString("en-IN")}
                    </td>

                  </tr>

                  {/* ================= FOOD ================= */}
                  <tr className="border-t border-dashed border-gray-300">
                    <td className="py-2 px-4 pb-4">

                      <div className="font-bold text-gray-900">
                        Meal Information
                      </div>

                      <div className="text-gray-500 text-sm mt-0">

                        {mealMode === "only" ? (
                          <>
                            Included in accommodation package
                            {hasMeals && (
                              <> • Veg {vegGuests} • Non-Veg {nonVegGuests}</>
                            )}
                          </>
                        ) : hasMeals ? (
                          foodBreakdownText
                        ) : (
                          "Meals not selected"
                        )}

                      </div>

                    </td>

                    <td className="p-4">996311</td>

                    <td className="p-4 text-right">—</td>
                    <td className="p-4 text-right">—</td>

                    <td className="p-4 text-right font-semibold">
                      {mealMode === "only"
                        ? "Included"
                        : `₹${mealTotal.toLocaleString("en-IN")}`}
                    </td>
                  </tr>


                </tbody>

              </table>
            </div>


            {/* ================= TOTALS ================= */}
            <div className="flex items-start gap-3 mt-3">
              <div className="w-[75%] bg-[#fff5f5] border border-dashed border-red-300 rounded-2xl p-5 text-[13px] text-red-700 leading-relaxed">
                <span className="font-semibold">Note:</span>{" "}
                Meals are optional add-ons for in-house guests and are billed as part of
                the accommodation package. GST is calculated on the package subtotal at
                the applicable accommodation rate.
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 text-[14px]">
                <p className="font-bold text-gray-800 mb-2 uppercase tracking-wide">
                  Totals
                </p>

                {/* Subtotal */}
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">
                    Subtotal (Taxable Value)
                  </span>
                  <span className="font-bold">
                    ₹{subTotal.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Discount */}
                {discountAmount > 0 && (
                  <div className="flex justify-between py-1 text-green-600">
                    <span>Discount</span>
                    <span className="font-bold">
                      -₹{discountAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {/* After Discount */}
                {discountAmount > 0 && (
                  <div className="flex justify-between py-1 pb-3 border-b border-dashed border-gray-300">
                    <span className="text-gray-600">
                      After Discount
                    </span>
                    <span className="font-bold">
                      ₹{discountedSubtotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                <div className="border-t border-dashed border-gray-300 mt-2 pt-2">

                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">
                      CGST @ 9%
                    </span>
                    <span className="font-bold">
                      ₹{cgstAmount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 pb-2 border-b border-dashed border-gray-300">
                    <span className="text-gray-600">
                      SGST @ 9%
                    </span>
                    <span className="font-bold">
                      ₹{sgstAmount.toLocaleString("en-IN")}
                    </span>
                  </div>

                </div>


                {/* TOTAL */}
                <div className="flex justify-between mt-3">
                  <span className="font-semibold text-gray-900">
                    Total Payable
                  </span>
                  <span className="font-bold text-primary text-xl">
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Amount in words */}
                <p className="text-gray-600 text-[14px] mt-0 leading-snug">
                  Amount in words:{" "}
                  <span className="font-medium text-gray-800">
                    {convertNumberToWords(grandTotal)} Only
                  </span>
                </p>
              </div>
            </div>

            {/* ================= PAYMENT ================= */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="border rounded-xl p-4 text-sm">
                <p className="font-bold mb-2">PAYMENT DETAILS</p>
                <p>Mode: <span className="capitalize font-bold">{booking.paymentProvider}</span></p>
                <p>Transaction ID: <span className="font-bold">{booking.paymentId}</span></p>
                <p>
                  Payment Status: <span className="text-green-500 font-bold">PAID</span>
                </p>
              </div>

              <div className="border rounded-xl p-4 text-sm text-right">
                <p>
                  For <span className="font-bold">Vidyasagar Properties Private Limited</span>
                  <br />
                  <span>(Trade name: Villa Gulposh)</span>
                </p>
                <div className="mt-10 border-t pt-2">
                  Authorized Signatory
                </div>
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
