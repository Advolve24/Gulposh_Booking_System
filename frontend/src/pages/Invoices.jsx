import { useEffect, useState } from "react";
import { api } from "../api/http";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Download } from "lucide-react"; // ✅ added icon

export default function Invoices() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api
      .get("/bookings/mine")
      .then((res) => {
        const data = res.data || [];
        // ✅ Sort by latest booking first
        const sorted = [...data].sort(
          (a, b) => new Date(b.startDate) - new Date(a.startDate)
        );
        setBookings(sorted);
      })
      .catch(() => setBookings([]));
  }, []);

  const downloadInvoice = async (id) => {
    const invoiceEl = document.getElementById("tm_download_section");
    if (!invoiceEl) {
      window.open(`/invoice-view/${id}`, "_blank");
      return;
    }
    const canvas = await html2canvas(invoiceEl, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`invoice-${id}.pdf`);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Invoices</h1>
      <div className="rounded-lg overflow-hidden border">
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Booking ID</th>
            <th className="p-2 text-left">Room</th>
            <th className="p-2 text-left">Dates</th>
            <th className="p-2 text-left">Amount</th>
            <th className="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const shortId = b._id?.slice(-5).toUpperCase() || "—";
            const start = format(new Date(b.startDate), "dd MMM yy");
            const end = format(new Date(b.endDate), "dd MMM yy");

            return (
              <tr key={b._id} className="border-t">
                <td className="p-2 font-mono">#{shortId}</td>
                <td className="p-2">
                  {b.isVilla ? "Entire Villa" : b.room?.name || "—"}
                </td>
                <td className="p-2">{`${start} - ${end}`}</td>
                <td className="p-2">₹{b.amount}</td>
                <td className="p-2">
                  <Button size="sm" onClick={() => downloadInvoice(b._id)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Invoice
                  </Button>
                </td>
              </tr>
            );
          })}

          {bookings.length === 0 && (
            <tr>
              <td colSpan="5" className="text-center p-4">
                No invoices found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
}
