import { useState } from "react";
import { Gift, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import SpecialOfferDialog from "@/components/SpecialOfferDialog";

export default function BirthdaySection({
  guests = [],
  title,
  accentIcon,
  dateKey = "birthday",
  actionHint = "Send wishes & special offers to retain guests",
}) {
  const month = format(new Date(), "MMMM");
  const [selectedGuest, setSelectedGuest] = useState(null);

  return (
    <div className="bg-card border border-border rounded-xl p-5 mt-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#6B2737]">
            {accentIcon}
          </div>

          <h3 className="font-semibold text-[15px]">
            {title || `Birthdays in ${month}`}
          </h3>

          <span className="text-xs bg-muted px-2 py-1 rounded-full">
            {guests.length} guests
          </span>
        </div>

        <p className="text-sm text-muted-foreground hidden md:block">
          {actionHint}
        </p>
      </div>

      {guests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No guests for this month.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {guests.map((g) => {
            const eventDate = new Date(g[dateKey]);
            const initials = g.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={g._id}
                className="inline-flex min-w-[250px] items-center gap-3 rounded-full border bg-[#faf9f8] px-3 py-2 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{g.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {format(eventDate, "dd MMM")} · {g.stays} stays · Last:{" "}
                    {g.lastStay ? format(new Date(g.lastStay), "dd MMM yy") : "-"}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => guestAction(`tel:${g.phone || ""}`)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-muted transition"
                  >
                    <Phone size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => guestAction(`mailto:${g.email || ""}`)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-muted transition"
                  >
                    <Mail size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedGuest(g)}
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-[#6B2737] px-3 text-xs text-white hover:opacity-90 transition"
                  >
                    <Gift size={12} />
                    Offer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SpecialOfferDialog
        open={!!selectedGuest}
        onOpenChange={(next) => {
          if (!next) setSelectedGuest(null);
        }}
        guest={selectedGuest}
        occasionType={dateKey === "anniversary" ? "anniversary" : "birthday"}
        dateKey={dateKey}
      />
    </div>
  );
}

function guestAction(url) {
  if (!url || url.endsWith(":")) return;
  window.open(url, "_self");
}
