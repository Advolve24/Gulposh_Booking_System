import { Link } from "react-router-dom";
import { Users, ArrowRight } from "lucide-react";

export default function RoomCard({ room, range, guests }) {
  const hasRange = range?.from && range?.to;
 const guestCount = Number(guests || 0);
const hasGuests = guestCount > 0;


  /* ---------------- QUERY PARAMS ---------------- */
  const params = new URLSearchParams();
  if (hasRange) {
    params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
  }
  if (hasGuests) params.set("guests", guestCount);

  const search = params.toString() ? `?${params.toString()}` : "";

  /* ---------------- MAX GUESTS ---------------- */
  const maxGuestsCap = (() => {
    if (typeof room.maxGuests === "number" && room.maxGuests > 0)
      return room.maxGuests;

    const nums = (room.accommodation || [])
      .flatMap((s) =>
        Array.from(String(s).matchAll(/\d+/g)).map((m) => Number(m[0]))
      )
      .filter((n) => Number.isFinite(n) && n > 0);

    return nums.length ? nums.reduce((a, b) => a + b, 0) : 1;
  })();

  const linkState =
    hasRange || hasGuests
      ? {
          ...(hasRange && {
            from: range.from.toISOString(),
            to: range.to.toISOString(),
          }),
          ...(hasGuests && { guests: guestCount }),
        }
      : undefined;
  /* ---------------- UI ---------------- */
  return (
    <div
      className="
        group
        bg-white
        rounded-2xl
        overflow-hidden
        shadow-md
        transition-all
        duration-300
        hover:shadow-xl
      "
    >
      {/* IMAGE */}
      <Link to={`/room/${room._id}${search}`} state={linkState}>
        <div className="relative h-56 overflow-hidden">
          <img
            src={room.coverImage || "https://picsum.photos/600/400"}
            alt={room.name}
            className="
              w-full
              h-full
              object-cover
              scale-110
              transition-transform
              duration-700
              ease-out
              group-hover:scale-100
            "
          />

          {/* subtle dark overlay */}
          <div
            className="
              absolute
              inset-0
              bg-black/10
              opacity-0
              group-hover:opacity-100
              transition
            "
          />
        </div>
      </Link>

      {/* CONTENT */}
      <div className="p-5 space-y-4">
        {/* TITLE + PRICE */}
        <div className="flex items-start justify-between gap-3">
          <Link to={`/room/${room._id}${search}`} state={linkState}>
            <h3
              className="
                text-lg
                font-serif
                font-semibold
                leading-tight
                transition-colors
                group-hover:text-[#9a0336]
              "
            >
              {room.name}
            </h3>
          </Link>

          <div className="text-right shrink-0">
            <div className="text-lg font-semibold">
              ₹{Number(room.pricePerNight).toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-muted-foreground">
              /night
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {room.description}
        </p>

        {/* FOOTER */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {/* GUEST PILL */}
          <div
            className="
              flex
              items-center
              gap-2
              border
              rounded-full
              px-3
              py-1.5
              text-sm
              text-muted-foreground
            "
          >
            <Users className="h-4 w-4" />
            <span>Upto {maxGuestsCap} Guests</span>
          </div>

          {/* CTA */}
          <Link
            to={`/room/${room._id}${search}`}
            state={linkState}
            className="w-32"
          >
            <button
              className="
                w-full
                h-10
                rounded-lg
                bg-primary
                text-primary-foreground
                font-medium
                transition
                hover:bg-primary/90
                active:scale-[0.97]
                flex
                items-center
                justify-center
                gap-2
              "
            >
              Reserve
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
