import { Link } from "react-router-dom";
import { Users, ArrowRight } from "lucide-react";

export default function RoomCard({ room, range, guests }) {

  const savedSearch = sessionStorage.getItem("searchParams");
  const searchState = savedSearch ? JSON.parse(savedSearch) : null;

  const params = new URLSearchParams();

  if (searchState?.range?.from && searchState?.range?.to) {
    params.set("from", searchState.range.from);
    params.set("to", searchState.range.to);
  }

  const totalGuests =
    typeof searchState?.adults === "number"
      ? searchState.adults + (searchState.children || 0)
      : guests || 0;

  if (totalGuests > 0) {
    params.set("guests", totalGuests);
  }

  const search = params.toString() ? `?${params.toString()}` : "";


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
      <Link to={`/room/${room._id}${search}`} state={searchState}>
        <div className="relative h-56 overflow-hidden">
          <img
            src={room.coverImage || "https://picsum.photos/600/400"}
            alt={room.name}
            className="
              w-full h-full object-cover
              scale-110 transition-transform
              duration-700 ease-out
              group-hover:scale-100
            "
          />

          {/* PRICE PILL */}
          <div
            className="
              absolute top-4 right-4
              bg-white/90 backdrop-blur-md
              text-[#ba081c]
              rounded-full
              px-3 py-1.5
              shadow-md
              text-sm md:text-base
              font-semibold
              flex items-center gap-1
            "
          >
            ₹{Number(room.pricePerNight).toLocaleString("en-IN")}
            <span className="text-xs font-normal text-muted-foreground">
              /night
            </span>
          </div>

          {/* subtle dark overlay */}
          <div
            className="
              absolute inset-0
              bg-black/10
              opacity-0
              group-hover:opacity-100
              transition
            "
          />
        </div>
      </Link>

      {/* CONTENT */}
      <div className="p-3 space-y-3">
        {/* TITLE */}
        <div className="flex items-start justify-between gap-3">
          <Link to={`/room/${room._id}${search}`} state={searchState}>
            <h3
              className="
                text-lg
                font-serif
                font-semibold
                leading-tight
                transition-colors
                group-hover:text-[#ba081c]
              "
            >
              {room.name}
            </h3>
          </Link>
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
            state={searchState}
            className="w-32"
          >
            <button
              className="
                w-full
                h-10
                rounded-lg
                bg-[#ba081c]
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
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
