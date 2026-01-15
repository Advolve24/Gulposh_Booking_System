import { useEffect } from "react";
import { X, Home, Calendar, Moon, Users, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { createPortal } from "react-dom";

/* ---------------- helpers ---------------- */

const dateFmt = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : format(dt, "dd MMM, yyyy");
};

const StatusBadge = ({ status }) => {
  const map = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-orange-100 text-orange-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
};

export default function BookingViewPopup({ open, booking, onClose }) {
  /* ---------------- SCROLL LOCK ---------------- */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [open]);

  /* ---------------- ESC KEY ---------------- */
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* ❗ Only hide UI, not component */
  if (!open || !booking) return null;

  const nights = Math.max(
    1,
    Math.round(
      (new Date(booking.endDate) - new Date(booking.startDate)) / 86400000
    )
  );

  return createPortal(
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/40 z-[9998]"
        onClick={onClose}
      />

      {/* POPUP */}
      <div
        className="
          fixed z-[9999]
          top-0 bottom-0 right-0
          w-[95vw] sm:w-[420px]
          bg-white rounded-xl
          shadow-2xl
          flex flex-col
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-4 border-b flex justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold truncate">
              {booking.user?.name || "Guest"}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              {booking.user?.email || "—"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={booking.status} />
            <button
              onClick={onClose}
              className="h-7 w-7 border rounded-md hover:bg-muted flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-4 space-y-4 overflow-y-auto">
          <Info icon={Home} label="Room" value={booking.room?.name || "Villa"} />

          <div className="grid grid-cols-2 gap-3">
            <Info icon={Calendar} label="Check-in" value={dateFmt(booking.startDate)} />
            <Info icon={Calendar} label="Check-out" value={dateFmt(booking.endDate)} />
            <Info icon={Moon} label="Nights" value={nights} />
            <Info icon={Users} label="Guests" value={`${booking.guests || 1}`} />
          </div>

          <Section title="Contact">
            <hr></hr>
            <RowC icon={Mail} value={booking.user?.email || "—"} />
            <RowC icon={Phone} value={booking.user?.phone || "—"} />
          </Section>

          <Section title="Payment">
            <hr></hr>
            <Row label="Status" value={<StatusBadge status={booking.status} />} />
            <Row label="Method" value="razorpay" />
            <Row label="Amount" value={`₹${booking.amount?.toLocaleString("en-IN")}`} />
            <Row label="Tax" value={`₹${(booking.amount * 0.18).toLocaleString("en-IN")}`} />
            <div className="bg-gray-50 p-2 rounded">
                <Row label="Grand Total" value={`₹${(booking.amount * 1.18).toLocaleString("en-IN")}`} />
            </div>
          </Section>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ---------------- UI helpers ---------------- */

function Info({ label, value, icon: Icon }) {
  return (
    <div className="border rounded-xl p-3 flex gap-3">
      <Icon size={18} className="text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function RowC({ value, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-muted-foreground" />
      <span className="font-medium">{value}</span>
    </div>
  );
}
