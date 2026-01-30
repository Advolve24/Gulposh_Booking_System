import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { ArrowLeft, Download } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { getBookingAdmin } from "@/api/admin";
import { toast } from "sonner";
import InvoiceContent from "@/components/InvoiceContent";

export default function InvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const pdfRef = useRef(null);
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

  const downloadPDF = async () => {
    toast.loading("Preparing invoice…");

    await new Promise((r) => setTimeout(r, 100));

    const canvas = await html2canvas(pdfRef.current, {
      scale: 1.25,
      backgroundColor: "#ffffff",
      windowWidth: 794,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);

    toast.dismiss();
    toast.success("Invoice download started");

    pdf.save(`Invoice-${booking._id}.pdf`);
  };

  if (!booking) return null;

  return (
    <AppLayout>
      <div className="max-w-5xl px-0 py-0">
        {/* TOP BAR */}
        <div className="flex justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft size={14} /> Back to Invoices
          </button>

          <Button size="lg" onClick={downloadPDF}>
            <Download size={14} /> Download PDF
          </Button>
        </div>

        {/* ========== VISIBLE RESPONSIVE VIEW ========== */}
        <div className="bg-white rounded-2xl border shadow-sm p-3 md:p-6 text-[13px]">
          <InvoiceContent booking={booking} responsive />
        </div>

        {/* ========== HIDDEN DESKTOP PDF VIEW ========== */}
        <div
          ref={pdfRef}
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: "894px",
          }}
        >
          <div className="bg-white p-6 text-[13px] w-full">
            <InvoiceContent booking={booking} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
