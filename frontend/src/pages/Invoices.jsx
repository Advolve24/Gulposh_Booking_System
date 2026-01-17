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

  const downloadInvoice = (id) => {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";

  iframe.src = `/invoice-view/${id}?download=true`;

  document.body.appendChild(iframe);

  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 3000);
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
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadInvoice(b._id);
                        }}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  </div>

                  {/* DATES */}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {start} – {end}
                  </div>

                  {/* VIEW CTA */}
                  <button
                    onClick={() => viewInvoice(b._id)}
                    className="mt-2 w-full text-xs text-primary font-medium text-left"
                  >
                    View invoice →
                  </button>
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

              return (
                <div
                  key={b._id}
                  onClick={() => viewInvoice(b._id)}
                  className="grid grid-cols-5 gap-4 px-6 py-4 items-center border-b last:border-b-0 cursor-pointer hover:bg-muted/40 transition"
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
                      onClick={() => viewInvoice(b._id)}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>

                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground"
                      onClick={() => downloadInvoice(b._id)}
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
