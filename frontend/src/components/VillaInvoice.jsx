import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { api } from "../api/http";
import InvoiceToPayTo from "../components/InvoiceToPayTo";
import PaymentInfo from "../components/PaymentInfo";
import SubTotalStyle2 from "../components/SubTotalStyle2";
import Signature from "../components/Signature";
import TermsStyle5 from "../components/TermsStyle5";
import TableStyle13 from "../components/TableStyle13";
import { format } from "date-fns";

export default function VillaInvoice() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const invoiceRef = useRef();

  // Fetch booking data
  useEffect(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => setBooking(res.data))
      .catch(() => setBooking(null));
  }, [id]);

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading invoice...
      </div>
    );
  }

  // --- Calculations ---
  const roomTotal = booking.pricePerNight * booking.nights;

  // Meal Breakdown
  const vegTotal = booking.vegGuests * booking.room.mealPriceVeg * booking.nights;
  const nonVegTotal = booking.nonVegGuests * booking.room.mealPriceNonVeg * booking.nights;
  const comboTotal = booking.comboGuests * booking.room.mealPriceCombo * booking.nights;

  const mealTotal = vegTotal + nonVegTotal + comboTotal;

  // Final totals
  const subTotal = roomTotal + mealTotal;
  const taxPercent = 12;
  const taxAmount = (subTotal * taxPercent) / 100;
  const grandTotal = subTotal + taxAmount;


  const tableData = [
    {
      item: "Room Charges",
      desc: "Night(s)",
      price: booking.pricePerNight,
      qty: booking.nights,
    },
  ];

  if (booking.withMeal) {
    if (booking.vegGuests > 0) {
      tableData.push({
        item: "Veg Meal",
        price: booking.room.mealPriceVeg,
        guests: booking.vegGuests,
        nights: booking.nights,
      });
    }

    if (booking.nonVegGuests > 0) {
      tableData.push({
        item: "Non-Veg Meal",
        desc: `${booking.nonVegGuests} guest(s)`,
        price: booking.room.mealPriceNonVeg,
        qty: booking.nights,
      });
    }

    if (booking.comboGuests > 0) {
      tableData.push({
        item: "Combo Meal",
        desc: `${booking.comboGuests} guest(s)`,
        price: booking.room.mealPriceCombo,
        qty: booking.nights,
      });
    }
  }


  // --- Download PDF ---
  const downloadPDF = async () => {
    const element = invoiceRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      scrollY: -window.scrollY,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`invoice-${booking._id}.pdf`);
  };

  const printPDF = async () => {
    const element = invoiceRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      scrollY: -window.scrollY,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    const pdfBlob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(blobUrl);

    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 flex items-start gap-8 justify-center py-10">
      <div
        className="tm_invoice tm_style2 bg-white rounded-2xl shadow-md p-8 w-[800px]"
        id="tm_download_section"
        ref={invoiceRef}
      >
        <div className="tm_invoice_in">
          <div className="tm_invoice_content">
            {/* Header */}
            <div className="tm_invoice_head tm_mb30 flex justify-between items-start border-b pb-4 mb-4">
              <div className="tm_invoice_left">
                <div className="tm_logo">
                  <img src="/pdfLogo.png" alt="Logo" className="h-14 rounded shadow p-1" />
                </div>
              </div>

              <div className="tm_invoice_right text-right">
                <b className="text-3xl font-semibold text-black">Invoice</b>
                <p className="m-0 text-sm text-gray-500">
                  Invoice Number - INV-{booking._id.toString().slice(-6)}
                </p>
              </div>
            </div>

            {/* Booking info */}
            <div className="tm_invoice_info tm_mb25 flex justify-between gap-6 w-auto">
              <div className="tm_invoice_info_left w-[30%]">
                <InvoiceToPayTo
                  title="Invoma Hotel"
                  subTitle={`Villa Gulposh Vidyasagar <br /> Properties Pvt Ltd. <br />Kirawali, Karjat - 410201<br />stay@villagulposh.com <br />+91 98200 74617`}
                />
              </div>

              <div className="tm_invoice_info_right w-[70%]">
                <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm">
                  <div>
                    <span>Check In:</span>
                    <br />
                    <b className="text-black">
                      {format(new Date(booking.startDate), "dd MMM yyyy")}
                    </b>
                  </div>
                  <div className="-ml-6">
                    <span>Check Out:</span>
                    <br />
                    <b className="text-black">
                      {format(new Date(booking.endDate), "dd MMM yyyy")}
                    </b>
                  </div>
                  <div className="-ml-10">
                    <span>Booking ID:</span>
                    <br />
                    <b className="text-black">
                      INV-{booking._id.toString().slice(-6).toUpperCase()}
                    </b>
                  </div>
                  <div>
                    <span>Nights:</span>
                    <br />
                    <b className="text-black">{booking.nights}</b>
                  </div>
                  <div className="-ml-6">
                    <span>Rooms:</span>
                    <br />
                    <b className="text-black">1</b>
                  </div>
                  <div className="-ml-10">
                    <span>Room Type:</span>
                    <br />
                    <b className="text-black">
                      {booking.room?.name || "Single"}
                    </b>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Info & Details */}
            <div className="grid grid-cols-2 border border-gray-200 rounded-lg mb-6 mt-3 p-2">
              <InvoiceToPayTo
                varient="tm_border_right tm_border_none_sm"
                title="Guest Info"
                subTitle={`Name: ${booking.contactName || booking.user?.name || "-"} <br />
  Phone: ${booking.contactPhone || booking.user?.phone || "-"} <br />
  Email: ${booking.contactEmail || booking.user?.email || "-"}`}
              />

              <InvoiceToPayTo
                title="Room And Service Details"
                subTitle="Room service is a hotel service enabling guests to choose items of food and drink for delivery to their hotel room for consumption."
              />
            </div>

            {/* Table */}
            <div className="tm_table tm_style1 mb-6">
              <div className="tm_round_border">
                <div className="tm_table_responsive">
                  <TableStyle13 data={tableData} />
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <PaymentInfo
                  varient="tm_left_footer"
                  title="Payment Info"
                  cardType={booking.paymentProvider
                    ? booking.paymentProvider.charAt(0).toUpperCase() + booking.paymentProvider.slice(1)
                    : "Online"}
                  cardNumber={booking.paymentId || booking.orderId || "N/A"}
                  amount={booking.amount || grandTotal}
                  author={booking.contactName || booking.user?.name || "-"}
                />

                <div className="tm_right_footer">
                  <SubTotalStyle2
                    subTotal={subTotal}
                    discountAmount={0}
                    discountPersent={0}
                    taxPersent={taxPercent}
                    taxAmount={taxAmount}
                    grandTotal={grandTotal}
                    gtBg="tm_gray_bg"
                    gtColor="tm_primary_color"
                  />
                </div>
              </div>

              <div className="tm_invoice_footer mt-6 flex justify-end">
                <Signature
                  imgUrl="/images/sign.svg"
                  name="Jhon Donate"
                  designation="Accounts Manager"
                />
              </div>
            </div>

            {/* Terms */}
            <div className="tm_note text-center text-gray-600 text-sm">
              <hr className="mb-3" />
              <TermsStyle5
                title="Terms And Condition"
                subTitle="Your use of the Website shall be deemed to constitute your understanding and approval of, and agreement to be bound by, the Privacy Policy and you consent to the collection."
              />
            </div>
          </div>
        </div>
      </div>

      {/* PDF Button */}
      <div className="flex flex-col gap-0">
        <button
          onClick={downloadPDF}
          className="mt-8 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800"
        >
          Download PDF
        </button>
        <button
          onClick={printPDF}
          className="mt-4 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800"
        >
          Print PDF
        </button>
      </div>
    </div>
  );
}
