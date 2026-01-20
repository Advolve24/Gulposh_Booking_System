import { format } from "date-fns";

const fmt = (d) => (d ? format(new Date(d), "dd MMM yyyy") : "—");

export default function InvoiceContent({ booking, responsive }) {
  const nights = booking.nights || 1;

  return (
    <>
      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <img src="/pdfLogo.png" className="h-14" />
        <h1 className="text-xl font-semibold">Invoice</h1>
      </div>

      {/* ADDRESS */}
      <div className="flex justify-between mb-6">
        <div className="space-y-1">
          <p className="font-semibold text-[16px]">Villa Address:</p>
          <p>Villa Gulposh Vidyasagar Properties Pvt Ltd.</p>
          <p>Kirawali, Karjat – 410201</p>
          <p>stay@villagulposh.com</p>
          <p>+91 98200 74617</p>
        </div>

        <div className="text-right">
          <p className="text-muted-foreground">Invoice Number</p>
          <p className="font-semibold">
            INV-{booking._id.slice(-6).toUpperCase()}
          </p>
        </div>
      </div>

      {/* GUEST + META */}
      <div
        className={`grid gap-4 mb-6 border rounded-xl p-3 ${
          responsive
            ? "grid-cols-1 md:grid-cols-[1.2fr_1fr]"
            : "grid-cols-[1.2fr_1fr]"
        }`}
      >
        <div>
          <p className="font-semibold mb-1">Guest Info:</p>
          <p>Name: {booking.user?.name}</p>
          <p>Phone: {booking.user?.phone}</p>
          <p>Email: {booking.user?.email}</p>
        </div>

        <div
          className={`grid gap-3 bg-muted/30 p-3 rounded-lg ${
            responsive ? "grid-cols-2 md:grid-cols-3" : "grid-cols-3"
          }`}
        >
          <Meta label="Check In">{fmt(booking.startDate)}</Meta>
          <Meta label="Check Out">{fmt(booking.endDate)}</Meta>
          <Meta label="Booking ID">
            INV-{booking._id.slice(-6).toUpperCase()}
          </Meta>
          <Meta label="Nights">{nights}</Meta>
          <Meta label="Rooms">1</Meta>
          <Meta label="Room Type">{booking.room?.name}</Meta>
        </div>
      </div>

      {/* TABLE */}
      <table className="w-full mb-6">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left px-4 py-3">Description</th>
            <th className="text-left px-4 py-3">Rate</th>
            <th className="text-right px-4 py-3">Total</th>
          </tr>
        </thead>
        <tbody>
          <Row
            label="Room Charges"
            rate={`₹${booking.pricePerNight} × ${nights}`}
            total={booking.roomTotal}
          />

          {booking.vegGuests > 0 && (
            <Row
              label="Veg Meal"
              rate={`₹${booking.room?.mealPriceVeg} × ${booking.vegGuests}`}
              total={booking.room?.mealPriceVeg * booking.vegGuests}
            />
          )}

          {booking.nonVegGuests > 0 && (
            <Row
              label="Non-Veg Meal"
              rate={`₹${booking.room?.mealPriceNonVeg} × ${booking.nonVegGuests}`}
              total={
                booking.room?.mealPriceNonVeg * booking.nonVegGuests
              }
            />
          )}
        </tbody>
      </table>

      {/* TOTALS */}
      <div className="grid grid-cols-2 mb-8">
        <div>
          <p className="font-semibold mb-1">Payment Info:</p>
          <p>{booking.user?.name}</p>
          <p>
            {booking.paymentProvider} – {booking.paymentId}
          </p>
          <p>Amount: ₹{booking.amount}</p>
        </div>

        <div>
          <Total label="SubTotal" value={booking.amount} />
          <Total
            label="Tax 12%"
            value={Math.round(booking.amount * 0.12)}
          />
          <div className="flex justify-between font-semibold mt-2">
            <span>Grand Total</span>
            <span>
              ₹{Math.round(booking.amount * 1.12).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* SIGNATURE */}
      <div className="text-right mb-6">
        <p className="italic mb-6">Signature</p>
        <p className="font-semibold">Jhon Donate</p>
        <p className="text-xs text-muted-foreground">
          Accounts Manager
        </p>
      </div>

      <div className="border-t pt-3 text-center text-[11px] text-muted-foreground">
        Terms And Condition: Your use of the website constitutes agreement
        to our Privacy Policy.
      </div>
    </>
  );
}

/* ---------- helpers ---------- */

const Meta = ({ label, children }) => (
  <div>
    <p className="text-[14px] text-muted-foreground">{label}</p>
    <p className="font-medium text-[16px]">{children}</p>
  </div>
);

const Row = ({ label, rate, total }) => (
  <tr className="border-t">
    <td className="px-4 py-3">{label}</td>
    <td className="px-4 py-3">{rate}</td>
    <td className="px-4 py-3 text-right">
      ₹{total.toLocaleString("en-IN")}
    </td>
  </tr>
);

const Total = ({ label, value }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-muted-foreground">{label}</span>
    <span>₹{value.toLocaleString("en-IN")}</span>
  </div>
);
