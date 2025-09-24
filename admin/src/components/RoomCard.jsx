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
 const params = new URLSearchParams();
  if (hasRange) {
    params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
  }
  if (hasGuests) params.set("guests", guests);
  const search = params.toString() ? `?${params.toString()}` : "";

 const linkTo = room.isVilla
   ? `/villa-booking${search}`
   : `/room/${room._id}${search}`;

  return (
   <div className="border rounded-xl bg-white overflow-hidden w-full">
    <img
      src={room.coverImage || "https://picsum.photos/600/400"}
      className="w-[100%] h-[100px] object-cover"
    />
  <div className="p-4 space-y-2 w-[100%] flex flex-col justify-between">
    <h3 className="text-lg font-semibold">{room.name}</h3>
    <div className="flex items-center justify-between">
      <span className="font-medium">₹{room.pricePerNight}/N</span>
      <Link to={linkTo} state={linkState} className="underline">
           {room.isVilla ? "Book Villa" : "Book Now"}
      </Link>
    </div>
  </div>
</div>

  );
}
