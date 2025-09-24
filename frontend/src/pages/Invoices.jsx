import { useEffect, useState } from "react";
import { api } from "../api/http";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function Invoices() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.get("/bookings/mine")
      .then(res => setBookings(res.data || []))
      .catch(() => setBookings([]));
  }, []);

  const downloadInvoice = (id) => {
    window.open(`${import.meta.env.VITE_API_URL}/invoice/${id}`, "_blank");
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Invoices</h1>
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
          {bookings.map(b => (
            <tr key={b._id} className="border-t">
              <td className="p-2">{b._id}</td>
              <td className="p-2">{b.isVilla ? "Entire Villa" : b.room?.name || "—"}</td>
              <td className="p-2">{format(new Date(b.startDate), "dd MMM yyyy")} → {format(new Date(b.endDate), "dd MMM yyyy")}</td>
              <td className="p-2">₹{b.amount}</td>
              <td className="p-2">
                <Button size="sm" onClick={() => downloadInvoice(b._id)}>
                  Download Invoice
                </Button>
              </td>
            </tr>
          ))}
          {bookings.length === 0 && (
            <tr><td colSpan="5" className="text-center p-4">No invoices found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
