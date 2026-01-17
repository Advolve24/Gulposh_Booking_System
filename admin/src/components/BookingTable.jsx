import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useMemo } from "react";


const dateFmt = (d) =>
  d ? format(new Date(d), "dd MMM yy") : "—";

const StatusChip = ({ status }) => {
  const map = {
    confirmed: {
      label: "Paid",
      cls: "bg-green-100 text-green-700 border-green-300",
    },
    pending: {
      label: "Pending",
      cls: "bg-orange-100 text-orange-700 border-orange-300",
    },
    cancelled: {
      label: "Cancelled",
      cls: "bg-red-100 text-red-700 border-red-300",
    },
  };

  const cfg = map[status];
  if (!cfg) return null;

  return (
    <span
      className={`
        inline-flex items-center
        px-3 py-0.5
        rounded-full
        text-[11px] font-medium
        border
        ${cfg.cls}
      `}
    >
      {cfg.label}
    </span>
  );
};

const guestLabel = (b) => {
  const adults = Number(b.adults ?? b.guests ?? 0);
  const children = Number(b.children ?? 0);
  const total = adults + children;

  return {
    main: `${adults} Adults, ${children} Children`,
    sub: `Total: ${total} Guests`,
  };
};

const nightsBetween = (from, to) => {
  const a = new Date(from);
  const b = new Date(to);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((b - a) / 86400000));
};



export default function BookingTable({
  bookings,
  onRowClick,
  onViewInvoice,
  onDownloadInvoice,
}) {


  const sortedBookings = useMemo(() => {
  return [...bookings].sort((a, b) => {
    const aStart = new Date(a.startDate).getTime();
    const bStart = new Date(b.startDate).getTime();

    if (aStart !== bStart) {
      return bStart - aStart;
    }

    const aEnd = new Date(a.endDate).getTime();
    const bEnd = new Date(b.endDate).getTime();
    return bEnd - aEnd;
  });
}, [bookings]);



  return (
    <div className="bg-card border rounded-xl overflow-x-auto">
      <table className="min-w-[1200px] w-full text-sm">
        <thead className="bg-muted/30">
          <tr className="text-muted-foreground">
            <th className="px-4 py-3 text-left">Booking ID</th>
            <th className="px-4 py-3 text-left">Guest</th>
            <th className="px-4 py-3 text-left">Room</th>
            <th className="px-4 py-3 text-left">Check in</th>
            <th className="px-4 py-3 text-left">Check out</th>
            <th className="px-4 py-3 text-center">Nights</th>
            <th className="px-4 py-3 text-left">Guests</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3 text-center">Payment</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {sortedBookings.map((b) => {
            const guests = guestLabel(b);

            return (
              <tr
                key={b._id}
                onClick={() => onRowClick?.(b)}
                className="
                  border-t
                  hover:bg-muted/20
                  cursor-pointer
                "
              >
                {/* Booking ID */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="font-medium">
                      #{b._id.slice(-6)}
                    </span>
                  </div>
                </td>

                {/* Guest */}
                <td className="px-4 py-4">
                  <div className="font-medium">{b.user?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.user?.phone}
                  </div>
                </td>

                {/* Room */}
                <td className="px-4 py-4">{b.room?.name}</td>

                {/* Dates */}
                <td className="px-4 py-4">{dateFmt(b.startDate)}</td>
                <td className="px-4 py-4">{dateFmt(b.endDate)}</td>

                {/* Nights */}
                <td className="px-4 py-4 text-center">
                  {nightsBetween(b.startDate, b.endDate)}
                </td>

                {/* Guests */}
                <td className="px-4 py-4">
                  <div>{guests.main}</div>
                  <div className="text-xs text-muted-foreground">
                    {guests.sub}
                  </div>
                </td>

                {/* Amount */}
                <td className="px-4 py-4 text-right font-medium">
                  ₹{b.amount?.toLocaleString("en-IN")}
                </td>

                {/* Payment */}
                <td className="px-4 py-4 text-center">
                  <StatusChip status={b.status} />
                </td>

                {/* Actions */}
                <td className="px-4 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded-md hover:bg-muted"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="bg-white">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick?.(b);
                        }}
                      >
                        View Booking
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewInvoice?.(b);
                        }}
                      >
                        View Invoice
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadInvoice?.(b);
                        }}
                      >
                        Download Invoice
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
