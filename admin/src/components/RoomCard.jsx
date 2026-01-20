import { Link } from "react-router-dom";

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

  const bookingLink = room.isVilla
    ? `/villa-booking${search}`
    : `/room/${room._id}${search}`;

  const imageLink = room.isVilla
    ? `/villa-booking${search}`
    : `/room/${room._id}`;

  return (
    <div className="border rounded-xl bg-white overflow-hidden w-full">
      {/* IMAGE CLICK → VIEW ROOM */}
      <Link to={imageLink} className="block">
        <img
          src={room.coverImage || "https://picsum.photos/600/400"}
          className="w-full h-[100px] object-cover hover:opacity-90 transition"
          alt={room.name}
        />
      </Link>

      <div className="p-4 space-y-2 w-full flex flex-col justify-between">
        <h3 className="text-lg font-semibold">{room.name}</h3>

        <div className="flex items-center justify-between">
          <span className="font-medium">₹{room.pricePerNight}/N</span>

          {/* CTA → BOOK */}
          <Link to={bookingLink} className="underline font-medium">
            {room.isVilla ? "Book Villa" : "Book Now"}
          </Link>
        </div>
      </div>
    </div>
  );
}
