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

  /* ================= LOAD BOOKINGS ================= */
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

  /* ================= NAVIGATION ================= */
  const viewInvoice = (id) => {
    navigate(`/invoice-view/${id}`);
  };

  const downloadInvoice = (id) => {
    navigate(`/invoice-download/${id}`);
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
          {/* ================= MOBILE CARDS ================= */}
          <div className="space-y-4 md:hidden">
            {bookings.map((b) => {
              const shortId = b._id.slice(-5).toUpperCase();
              const start = format(new Date(b.startDate), "dd MMM yy");
              const end = format(new Date(b.endDate), "dd MMM yy");

              return (
                <div
                  key={b._id}
                  onClick={() => viewInvoice(b._id)}
                  className="
                    rounded-2xl
                    border
                    bg-white
                    p-5
                    space-y-2.5
                    shadow-sm
                    cursor-pointer
                    active:scale-[0.98]
                    transition
                  "
                >
                  {/* BOOKING ID */}
                  <div className="text-xs font-medium text-primary">
                    #{shortId}
                  </div>

                  {/* TITLE */}
                  <div className="text-base font-semibold leading-tight">
                    {b.isVilla ? "Entire Villa" : b.room?.name || "—"}
                  </div>

                  {/* DATES */}
                  <div className="text-sm text-muted-foreground">
                    {start} – {end}
                  </div>

                  {/* AMOUNT */}
                  <div className="pt-1 text-lg font-semibold">
                    ₹{b.amount}
                  </div>

                  {/* CTA */}
                  <div className="pt-2 text-sm text-primary font-medium">
                    Tap to view invoice →
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================= DESKTOP TABLE ================= */}
          <div className="hidden md:block bg-white border rounded-2xl overflow-hidden shadow-sm">
            {/* TABLE HEADER */}
            <div className="grid grid-cols-5 gap-4 px-6 py-4 bg-[#faf6f2] border-b text-sm font-medium">
              <div>Booking ID</div>
              <div>Room</div>
              <div>Dates</div>
              <div>Amount</div>
              <div className="text-right">Actions</div>
            </div>

            {/* TABLE ROWS */}
            {bookings.map((b) => {
              const shortId = b._id.slice(-5).toUpperCase();
              const start = format(new Date(b.startDate), "dd MMM yy");
              const end = format(new Date(b.endDate), "dd MMM yy");

              return (
                <div
                  key={b._id}
                  className="grid grid-cols-5 gap-4 px-6 py-4 items-center border-b last:border-b-0"
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

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg flex items-center gap-1"
                      onClick={() => viewInvoice(b._id)}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>

                    <Button
                      size="sm"
                      className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
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
