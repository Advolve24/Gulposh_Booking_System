import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/http";
import ImageSlider from "../components/ImageSlider";

import {
  Wifi,
  AirVent,
  Car,
  Bath,
  Monitor,
  Coffee,
  Flame,
  Utensils,
  Landmark,
  Mountain,
  Waves,
  BedDouble,
  BedSingle,
  Users,
  Home,
} from "lucide-react";

const ICONS = {
  wifi: Wifi,
  ac: AirVent,
  parking: Car,
  pool: Waves,
  tv: Monitor,
  breakfast: Coffee,
  heater: Flame,
  kitchen: Utensils,
  balcony: Landmark,
  mountainview: Mountain,
  seaview: Waves,
  gardenview: Landmark,

  "2 guests": Users,
  "3 guests": Users,
  "4 guests": Users,
  "5 guests": Users,
  "6 guests": Users,

  "double bed": BedDouble,
  "queen bed": BedDouble,
  "king bed": BedDouble,
  "single bed": BedSingle,

  "private bathroom": Bath,
  "1 bhk villa": Home,
  "2 bhk villa": Home,
  "3 bhk villa": Home,
};

function IconRow({ title, list }) {
  if (!list?.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">{title}</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {list.map((item, i) => {
          const key = item.toLowerCase().trim();
          const Icon = ICONS[key] || ICONS[key.replace(" view", "")];

          return (
            <div
              key={i}
              className="flex items-center gap-3 border rounded-lg px-3 py-2"
            >
              {Icon ? (
                <Icon className="w-5 h-5 text-gray-700" />
              ) : (
                <Landmark className="w-5 h-5 text-gray-700" />
              )}
              <span className="text-sm capitalize">{item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminRoomView() {
  const { id } = useParams();

  const [room, setRoom] = useState(null);

  useEffect(() => {
    api
      .get(`/rooms/${id}`)
      .then(({ data }) => setRoom(data))
      .catch(() => setRoom(null));
  }, [id]);

  const allImages = useMemo(
    () => [room?.coverImage, ...(room?.galleryImages || [])].filter(Boolean),
    [room]
  );

  if (!room) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-8">

      {/* EDIT BUTTON */}
      <div className="flex justify-end">
        <Link to={`/rooms/new?id=${room._id}`}>
          <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-100 transition">
            Edit Room
          </button>
        </Link>
      </div>

      {/* Images */}
      <ImageSlider images={allImages} />

      {/* Room Title + Pricing */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{room.name}</h1>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-lg sm:text-xl font-semibold">
            ₹{Number(room.pricePerNight).toLocaleString("en-IN")}/night
          </span>

          {room.priceWithMeal > 0 && (
            <>
              <div className="hidden sm:block h-5 w-px bg-gray-300" />
              <span className="text-lg sm:text-xl">
                ₹{(Number(room.pricePerNight) + Number(room.priceWithMeal)).toLocaleString("en-IN")} with meal
              </span>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
        {room.description}
      </p>

      {/* ICON SECTIONS */}
      <div className="space-y-6">
        <IconRow title="Room Services" list={room.roomServices} />
        <IconRow title="Accommodation" list={room.accommodation} />
      </div>
    </div>
  );
}
