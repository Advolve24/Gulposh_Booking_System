import { Calendar, Moon, Users, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/* ---------- helpers ---------- */

const dateFmt = (d) =>
  d ? format(new Date(d), "dd MMM yy") : "—";

const nightsBetween = (from, to) => {
  const a = new Date(from);
  const b = new Date(to);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((b - a) / 86400000));
};

const StatusBadge = ({ status }) => {
  const map = {
    confirmed: "bg-green-100 text-green-700 border-green-300",
    pending: "bg-orange-100 text-orange-700 border-orange-300",
    cancelled: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <span
      className={`
        inline-flex items-center
        px-3 py-0.5
        rounded-full
        text-xs font-medium
        border
        ${map[status] || "bg-muted text-muted-foreground"}
      `}
    >
      {status === "confirmed" ? "Paid" : status}
    </span>
  );
};

const guestLabel = (b) => {
  const adults = Number(b.adults ?? b.guests ?? 0);
  const children = Number(b.children ?? 0);
  return `${adults} Adults, ${children} Children`;
};

/* ---------- component ---------- */

export default function MobileBookingCard({
  booking,
  onOpen,          // 🔑 open popup
  onViewInvoice,
  onDownloadInvoice,
}) {
  return (
    <div
      onClick={() => onOpen?.(booking)}
      className="
        bg-card border rounded-xl
        p-4 space-y-2
        cursor-pointer
        hover:bg-muted/30
        transition
      "
    >
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <div className="font-semibold leading-tight">
            {booking.user?.name || "Guest"}
          </div>
          <div className="text-xs text-muted-foreground">
            {booking.room?.name}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={booking.status} />

          {/* ACTION MENU */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-md hover:bg-muted"
              >
                <MoreHorizontal size={18} />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
             className="bg-white"
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={() => onOpen?.(booking)}>
                View Booking
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onViewInvoice?.(booking)}
              >
                View Invoice
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onDownloadInvoice?.(booking)}
              >
                Download Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* META */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {dateFmt(booking.startDate)} – {dateFmt(booking.endDate)}
        </span>

        <span className="flex items-center gap-1">
          <Moon size={12} />
          {nightsBetween(booking.startDate, booking.endDate)} Nights
        </span>

        <span className="flex items-center gap-1">
          <Users size={12} />
          {guestLabel(booking)}
        </span>
      </div>

      {/* AMOUNT */}
      <div className="text-right font-semibold">
        ₹{booking.amount?.toLocaleString("en-IN")}
      </div>
    </div>
  );
}
