import { useEffect, useState } from "react";
import { api } from "../api/http";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Eye, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Invoices() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/bookings/mine")
      .then((res) => {
        const data = res.data || [];
        const sorted = [...data].sort(
          (a, b) => new Date(b.startDate) - new Date(a.startDate)
        );
        setBookings(sorted);
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const viewInvoice = (id) => {
    navigate(`/invoice-view/${id}`);
  };

  const downloadInvoice = async (id) => {
  try {
    const res = await api.get(`/invoice/user/${id}/download`, {
      responseType: "blob",
      withCredentials: true, // ✅ REQUIRED
    });

    const blob = new Blob([res.data], { type: "application/pdf" });

    // ✅ Safari-safe download
    const fileURL = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = fileURL;
    a.download = `Invoice-${id.slice(-6).toUpperCase()}.pdf`;

    // iOS Safari needs this
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.URL.revokeObjectURL(fileURL);
  } catch (err) {
    console.error("Invoice download failed", err);
  }
};



  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-serif font-semibold">My Invoices</h1>
        <p className="text-muted-foreground mt-1">
          View and download your booking invoices
        </p>
      </div>

      {/* LOADING / EMPTY */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading invoices…
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No invoices found
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {bookings.map((b) => {
              const shortId = b._id.slice(-5).toUpperCase();
              const start = format(new Date(b.startDate), "dd MMM yy");
              const end = format(new Date(b.endDate), "dd MMM yy");
              const isCancelled = b.status === "cancelled";

              return (
                <div
                  key={b._id}
                  className="border rounded-xl bg-white p-3 shadow-sm"
                >
                  {/* TOP ROW */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-medium text-primary">
                        #{shortId}
                      </div>
                      <div className="text-sm font-semibold leading-tight">
                        {b.isVilla ? "Entire Villa" : b.room?.name || "—"}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        ₹{b.amount}
                      </div>
                      <button
                        disabled={isCancelled}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isCancelled) downloadInvoice(b._id);
                        }}
                        className={`mt-1 inline-flex items-center gap-1 text-xs font-medium
                          ${isCancelled
                            ? "text-muted-foreground cursor-not-allowed"
                            : "text-primary"}
                            `}
                      >
                        <Download className="w-3.5 h-3.5" />
                        {isCancelled ? "Unavailable" : "Download"}
                      </button>

                    </div>
                  </div>

                  {/* DATES */}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {start} – {end}
                  </div>

                  {/* VIEW CTA */}
                  {isCancelled ? (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      Booking cancelled – invoice unavailable
                    </div>
                  ) : (
                    <button
                      onClick={() => viewInvoice(b._id)}
                      className="mt-2 w-full text-xs text-primary font-medium text-left"
                    >
                      View invoice →
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* ================= DESKTOP TABLE ================= */}
          <div className="hidden md:block bg-white border rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-5 gap-4 px-6 py-4 bg-[#faf6f2] border-b text-sm font-medium">
              <div>Booking ID</div>
              <div>Room</div>
              <div>Dates</div>
              <div>Amount</div>
              <div className="text-right">Actions</div>
            </div>

            {bookings.map((b) => {
              const shortId = b._id.slice(-5).toUpperCase();
              const start = format(new Date(b.startDate), "dd MMM yy");
              const end = format(new Date(b.endDate), "dd MMM yy");
              const isCancelled = b.status === "cancelled";

              return (
                <div
                  key={b._id}
                  onClick={() => {
                    if (!isCancelled) viewInvoice(b._id);
                  }}
                  className={`grid grid-cols-5 gap-4 px-6 py-4 items-center border-b last:border-b-0 transition
               ${isCancelled
                      ? "bg-muted/30 text-muted-foreground cursor-not-allowed"
                      : "cursor-pointer hover:bg-muted/40"}
                    `}
                >

                  <div className="font-medium text-primary">
                    #{shortId}
                  </div>

                  <div>
                    {b.isVilla ? "Entire Villa" : b.room?.name || "—"}
                  </div>

                  <div className="text-muted-foreground">
                    {start} – {end}
                  </div>

                  <div className="font-semibold">
                    ₹{b.amount}
                  </div>

                  <div
                    className="flex justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isCancelled}
                      onClick={() => !isCancelled && viewInvoice(b._id)}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>

                    <Button
                      size="sm"
                      disabled={isCancelled}
                      className={
                        isCancelled
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-primary text-primary-foreground"
                      }
                      onClick={() => !isCancelled && downloadInvoice(b._id)}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>

                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
