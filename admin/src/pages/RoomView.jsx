import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { api } from "@/api/http";
import ImageSlider from "@/components/ImageSlider";

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
  Home,
  ClipboardList,
  Star,
  ArrowLeft,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

/* ================= ICON MAP ================= */
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
  "double bed": BedDouble,
  "queen bed": BedDouble,
  "king bed": BedDouble,
  "single bed": BedSingle,
  "private bathroom": Bath,
  "1 bhk villa": Home,
  "2 bhk villa": Home,
  "3 bhk villa": Home,
};

/* ================= HELPERS ================= */
const prettify = (str = "") =>
  str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/* ================= ICON GRID ================= */
function IconRow({ title, list }) {
  if (!Array.isArray(list) || list.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">{title}</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {list.map((item, i) => {
          const key = String(item).toLowerCase().replace(/_/g, "");
          const Icon = ICONS[key] || Landmark;

          return (
            <div
              key={i}
              className="flex items-center gap-3 border border-border rounded-lg px-3 py-2 bg-card"
            >
              <Icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">{prettify(item)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= REVIEW CARD ================= */
function ReviewCard({ r }) {
  return (
    <div className="border border-border rounded-lg p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{r.name || "Guest"}</span>
        <span className="text-yellow-500">
          {"★".repeat(Number(r.rating || 0))}
        </span>
      </div>

      {r.comment && (
        <p className="text-muted-foreground mt-1">{r.comment}</p>
      )}
    </div>
  );
}

/* ================= PAGE ================= */
export default function AdminRoomView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/rooms/${id}`).then(({ data }) => setRoom(data));
  }, [id]);

  const images = useMemo(
    () =>
      [room?.coverImage, ...(room?.galleryImages || [])].filter(Boolean),
    [room]
  );

  const avgRating = useMemo(() => {
    if (!room?.reviews?.length) return null;
    const total = room.reviews.reduce((a, r) => a + r.rating, 0);
    return (total / room.reviews.length).toFixed(1);
  }, [room]);

  const visibleReviews = showAllReviews
    ? room?.reviews
    : room?.reviews?.slice(0, 1);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/admin/rooms/${room._id}`);
      navigate("/rooms");
    } finally {
      setDeleting(false);
    }
  };

  if (!room) return null;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* TOP BAR */}
        <div className="flex items-center justify-between gap-4">
          {/* BACK */}
          <Link
            to="/rooms"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          {/* ACTIONS */}
          <div className="flex items-center gap-3">
            {/* EDIT */}
            <Link
              to={`/rooms/new?id=${room._id}`}
              className="
        inline-flex items-center gap-2
        h-10 px-4
        rounded-lg
        text-sm font-medium
        border border-border
        bg-card
        text-foreground
        hover:bg-muted/60
        transition
      "
            >
              <Pencil size={14} />
              Edit Room
            </Link>

            {/* DELETE */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="
            inline-flex items-center gap-2
            h-10 px-4
            rounded-lg
            text-sm font-medium
            bg-destructive
            text-destructive-foreground
            hover:opacity-90
            transition
          "
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </AlertDialogTrigger>

              <AlertDialogContent className="bg-card border border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Room?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This action cannot be undone. This will permanently delete this room.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-card">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:opacity-90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>


        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* LEFT */}
          <div className="space-y-8">
            <ImageSlider images={images} />

            <div>
              <h1 className="text-[20px] sm:text-2xl font-semibold">{room.name}</h1>
              <p className="text-[14px] sm:text-muted-foreground">
                ₹{room.pricePerNight.toLocaleString("en-IN")} / night
              </p>
            </div>

          
            {/* ================= AMENITIES ================= */}
            {Array.isArray(room.amenities) && room.amenities.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold text-lg mb-5">Amenities</h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
                  {room.amenities.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-sm"
                    >
                      {/* CHECK ICON */}
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>

                      {/* TEXT */}
                      <span className="leading-snug">
                        {item
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* ================= HOUSE RULES ================= */}
            {Array.isArray(room.houseRules) && room.houseRules.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold text-lg mb-5">House Rules</h3>

                <ul className="space-y-4">
                  {room.houseRules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-4 text-sm">
                      {/* NUMBER CIRCLE */}
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-primary">
                        {i + 1}
                      </span>

                      {/* TEXT */}
                      <span className="text-muted-foreground">
                        {rule}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}


            {room.reviews?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Star size={16} className="text-yellow-500" />
                    Guest Reviews ({room.reviews.length})
                  </h3>

                  {room.reviews.length > 1 && (
                    <button
                      onClick={() => setShowAllReviews(!showAllReviews)}
                      className="text-sm text-primary hover:underline"
                    >
                      {showAllReviews ? "Show less" : "View all"}
                    </button>
                  )}
                </div>

                {avgRating && (
                  <div className="text-sm">
                    {avgRating} ★★★★★
                  </div>
                )}

                {visibleReviews.map((r, i) => (
                  <ReviewCard key={i} r={r} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — TRUE STICKY */}
          <aside className="relative">
            <div className="sticky top-[96px] self-start bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold">Pricing</h3>

              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Per Night</div>
                <div className="text-2xl font-semibold text-primary">
                  ₹{room.pricePerNight.toLocaleString("en-IN")}
                </div>
              </div>

              <div className="text-sm space-y-2">
                {room.mealPriceVeg > 0 && (
                  <div className="flex justify-between">
                    <span>Vegetarian</span>
                    <span>₹{room.mealPriceVeg}</span>
                  </div>
                )}
                {room.mealPriceNonVeg > 0 && (
                  <div className="flex justify-between">
                    <span>Non-Vegetarian</span>
                    <span>₹{room.mealPriceNonVeg}</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
