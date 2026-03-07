import { Gift, Mail, Phone, Cake } from "lucide-react";
import { format } from "date-fns";

export default function BirthdaySection({ guests = [] }) {

  const month = format(new Date(), "MMMM");

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mt-6">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">

        <div className="flex items-center gap-3">
          <Cake size={18} className="text-[#6B2737]" />

          <h3 className="font-semibold">
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


      {/* CARDS */}

      <div className="grid md:grid-cols-4 gap-4">

        {guests.map((g, i) => {

          const birthday = new Date(g.birthday)

          const passed = birthday < new Date()

          return (

            <div
              key={i}
              className="border rounded-xl p-4 flex flex-col gap-3"
            >

              {/* TOP */}
              <div className="flex items-start justify-between">

                <div className="flex gap-3">

                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    {g.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>

                  <div>

                    <p className="font-medium text-sm">
                      {g.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {g.stays} stays · Last: {g.lastStay}
                    </p>

                  </div>

                </div>

                <span className="text-xs bg-muted px-2 py-1 rounded-md">
                  {format(birthday, "dd MMM")}
                </span>

              </div>


              {/* STATUS */}

              {passed && (
                <p className="text-xs text-muted-foreground italic">
                  Birthday has passed
                </p>
              )}


              {/* ACTIONS */}

              <div className="flex items-center gap-2 mt-1">

                <button className="h-9 w-9 border rounded-md flex items-center justify-center hover:bg-muted">
                  <Phone size={16} />
                </button>

                <button className="h-9 w-9 border rounded-md flex items-center justify-center hover:bg-muted">
                  <Mail size={16} />
                </button>

                <button className="flex items-center gap-2 px-3 h-9 rounded-md bg-[#6B2737] text-white text-sm hover:opacity-90">
                  <Gift size={14} />
                  Special Offer
                </button>

              </div>


              {passed && (
                <p className="text-xs text-green-600">
                  ✓ Wish sent
                </p>
              )}

            </div>

          )

        })}

      </div>

    </div>
  )
}