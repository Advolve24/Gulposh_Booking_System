import { Gift, Mail, Phone, Cake } from "lucide-react";
import { format } from "date-fns";

export default function BirthdaySection({ guests = [] }) {

  const month = format(new Date(), "MMMM");

  return (
    <div className="bg-card border border-border rounded-xl p-6 mt-6">

      {/* ================= HEADER ================= */}

      <div className="flex items-center justify-between mb-6">

        <div className="flex items-center gap-3">

          <div className="flex items-center gap-2">
            <Cake size={18} className="text-[#6B2737]" />
            <span className="text-lg">🎂</span>
          </div>

          <h3 className="font-semibold text-[15px]">
            Birthdays in {month}
          </h3>

          <span className="text-xs bg-muted px-2 py-1 rounded-full">
            {guests.length} guests
          </span>

        </div>

        <p className="text-sm text-muted-foreground hidden md:block">
          Send wishes & special offers to retain guests
        </p>

      </div>

      {/* ================= CARDS ================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">

        {guests.map((g) => {

          const birthday = new Date(g.birthday);
          const today = new Date();

          const passed = birthday.getDate() < today.getDate() &&
            birthday.getMonth() === today.getMonth();

          const initials = g.name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (

            <div
              key={g._id}
              className="border rounded-xl p-4 flex flex-col gap-4 shadow-sm hover:shadow-md transition"
            >

              {/* ================= TOP ================= */}

              {/* DATE BADGE */}
               <div className="flex items-start justify-end -mb-[16px]">
                <span className="text-xs bg-[#6B2737] text-white px-2 py-1 rounded-full flex items-center gap-1">
                  <Cake size={12} />
                  {format(birthday, "dd MMM")}
                </span>
                </div>

              <div className="flex items-start justify-between">

                <div className="flex gap-3">

                  {/* AVATAR */}
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    {initials}
                  </div>

                  {/* NAME + STATS */}
                  <div>

                    <p className="font-medium text-sm">
                      {g.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {g.stays} stays · Last: {g.lastStay ? format(new Date(g.lastStay), "dd MMM yy") : "—"}
                    </p>

                  </div>

                </div>

              </div>

              {/* ================= STATUS ================= */}

              {passed && (
                <p className="text-xs text-muted-foreground italic">
                  Birthday has passed
                </p>
              )}

              {/* ================= ACTION BUTTONS ================= */}

              <div className="flex items-center gap-2">

                <button
                  onClick={() => {}}
                  className="h-9 w-9 border rounded-md flex items-center justify-center hover:bg-muted transition"
                >
                  <Phone size={16} />
                </button>

                <button
                  onClick={() => {}}
                  className="h-9 w-9 border rounded-md flex items-center justify-center hover:bg-muted transition"
                >
                  <Mail size={16} />
                </button>

                <button
                  onClick={() => {}}
                  className="flex items-center gap-2 px-3 h-9 rounded-md bg-[#6B2737] text-white text-sm hover:opacity-90 transition"
                >
                  <Gift size={14} />
                  Special Offer
                </button>

              </div>

              {/* ================= SENT STATUS ================= */}

              {passed && (
                <p className="text-xs text-green-600">
                  ✓ Wish sent
                </p>
              )}

            </div>

          );
        })}

      </div>

    </div>
  );
}