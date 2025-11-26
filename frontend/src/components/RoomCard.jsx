import { Link } from "react-router-dom";
import { Button } from "./ui/button";

export default function RoomCard({ room, range, guests }) {
  const hasRange = range?.from && range?.to;
  const hasGuests = !!guests;

  const params = new URLSearchParams();
  if (hasRange) {
    params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
  }
  if (hasGuests) params.set("guests", guests);

  const search = params.toString() ? `?${params.toString()}` : "";

  const maxGuestsCap = (() => {
  if (!room) return null;

  if (typeof room.maxGuests === "number" && room.maxGuests > 0)
    return room.maxGuests;

  const nums = (room.accommodation || [])
    .flatMap(s => Array.from(String(s).matchAll(/\d+/g)).map(m => Number(m[0])))
    .filter(n => Number.isFinite(n) && n > 0);

  const sum = nums.length ? nums.reduce((a, b) => a + b, 0) : 0;
  return Math.max(1, sum || 1);
})();


  const linkState =
    hasRange || hasGuests
      ? {
        ...(hasRange && {
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        }),
        ...(hasGuests && { guests }),
      }
      : undefined;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-3 max-w-sm mx-auto transition hover:shadow-2xl">
      <Link to={`/room/${room._id}${search}`} state={linkState}>
        <div className="overflow-hidden rounded-xl">
          <img
            src={room.coverImage || "https://picsum.photos/600/400"}
            alt={room.name}
            className="w-full h-48 object-cover transform hover:scale-105 duration-300"
          />
        </div>
      </Link>

      <div className="px-1 py-4 space-y-3">
        <div className="flex items-start justify-between">
          <Link to={`/room/${room._id}${search}`} state={linkState}>
            <h3 className="text-lg font-semibold text-gray-900">
              {room.name}
            </h3>
          </Link>

          <div className="bg-gray-100 text-gray-900 text-[16px] font-semibold px-3 py-1 rounded-full shadow-sm">
            ₹{Number(room.pricePerNight).toLocaleString("en-IN")}/night
          </div>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
          {room.description}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-gray-900 text-sm mt-3 bg-gray-200 px-3 py-[10px] w-[38%] rounded-[8px]">
            Upto {maxGuestsCap} guests
          </span>
          <Link to={`/room/${room._id}${search}`} state={linkState} className="w-[60%]">
            <button className="w-full bg-primary text-white font-medium py-2 rounded-[8px] mt-3 hover:bg-primary-100 transition">
              Reserve
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
