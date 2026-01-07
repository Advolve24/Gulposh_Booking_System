import { useEffect, useState } from "react";
import { api } from "../api/http";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Eye, Download } from "lucide-react";

export default function Invoices() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const viewInvoice = (id) => {
    window.open(`/invoice-view/${id}`, "_blank");
  };

  const downloadInvoice = (id) => {
    window.open(`/invoice-download/${id}`, "_blank");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-serif font-semibold">
          My Invoices
        </h1>
        <p className="text-muted-foreground mt-1">
          View and download your booking invoices
        </p>
      </div>

      {/* TABLE CARD */}
      <div className="
        bg-white
        border
        rounded-2xl
        overflow-hidden
        shadow-sm
      ">

        {/* TABLE HEADER */}
        <div className="
          grid
          grid-cols-5
          gap-4
          px-6
          py-4
          text-sm
          font-medium
          bg-[#faf6f2]
          border-b
        ">
          <div>Booking ID</div>
          <div>Room</div>
          <div>Dates</div>
          <div>Amount</div>
          <div className="text-right">Actions</div>
        </div>

        {/* TABLE BODY */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading invoices…
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No invoices found
          </div>
        ) : (
          bookings.map((b) => {
            const shortId = b._id?.slice(-5).toUpperCase();
            const start = format(new Date(b.startDate), "dd MMM yy");
            const end = format(new Date(b.endDate), "dd MMM yy");

            return (
              <div
                key={b._id}
                className="
                  grid
                  grid-cols-1
                  md:grid-cols-5
                  gap-4
                  px-6
                  py-4
                  items-center
                  border-b
                  last:border-b-0
                "
              >
                {/* BOOKING ID */}
                <div className="font-medium text-primary">
                  #{shortId}
                </div>

                {/* ROOM */}
                <div>
                  {b.isVilla
                    ? "Entire Villa"
                    : b.room?.name || "—"}
                </div>

                {/* DATES */}
                <div className="text-muted-foreground">
                  {start} - {end}
                </div>

                {/* AMOUNT */}
                <div className="font-semibold">
                  ₹{b.amount}
                </div>

                {/* ACTIONS */}
                <div className="
                  flex
                  gap-2
                  md:justify-end
                ">
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
                    className="
                      rounded-lg
                      bg-primary
                      text-primary-foreground
                      hover:bg-primary/90
                      flex items-center gap-1
                    "
                    onClick={() => downloadInvoice(b._id)}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
