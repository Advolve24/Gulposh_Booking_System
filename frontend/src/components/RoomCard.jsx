import { Link } from "react-router-dom";


export default function RoomCard({ room , range, guests }) {
  const hasRange = range?.from && range?.to;
  const hasGuests = !!guests;
  const linkState = (hasRange || hasGuests)
    ? {
        ...(hasRange && { from: range.from.toISOString(), to: range.to.toISOString() }),
        ...(hasGuests && { guests }),
      }
    : undefined;
  // (Optional) also include query params so a refresh keeps the dates
 const params = new URLSearchParams();
  if (hasRange) {
    params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
  }
  if (hasGuests) params.set("guests", guests);
  const search = params.toString() ? `?${params.toString()}` : "";

  return (
    <div className="border rounded-xl overflow-hidden">
      <img src={room.coverImage || "https://picsum.photos/600/400"} className="w-full h-48 object-cover" />
      <div className="p-4 space-y-2">
        <h3 className="text-lg font-semibold">{room.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">{room.description}</p>
        <div className="flex items-center justify-between">
           <span className="font-medium">₹{room.pricePerNight}/night</span>
          <Link to={`/room/${room._id}${search}`} state={linkState} className="underline">
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
