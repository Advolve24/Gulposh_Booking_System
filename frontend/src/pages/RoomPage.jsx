import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../store/authStore";

import { api } from "../api/http";
import CalendarRange from "../components/CalendarRange";
import GuestCounter from "../components/GuestCounter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  Wifi,
  BedDouble,
  ShieldCheck,
  Refrigerator,
  Tv,
  Coffee,
  Music,
  Car,
  Utensils,
  Shirt,
  Clock,
  Ban,
  Users,
  IdCard,
  MapPin,
  Star,
  ChevronDown,
} from "lucide-react";

import { toDateOnlyFromAPI, toDateOnlyFromAPIUTC } from "../lib/date";

/* ---------------------------------------------------------------- */
/* HELPERS */
/* ---------------------------------------------------------------- */

const humanize = (v = "") =>
  v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const AMENITY_ICONS = {
  wifi: Wifi,
  highspeed_wifi: Wifi,
  comfy_mattress: BedDouble,
  fresh_linen: BedDouble,
  toiletries: ShieldCheck,
  refrigerator: Refrigerator,
  smart_tv: Tv,
  ott_apps: Tv,
  tea_coffee: Coffee,
  music_system: Music,
  dining_table: Utensils,
  wardrobe: Shirt,
  free_parking: Car,
};

const ruleIcon = (text = "") => {
  const t = text.toLowerCase();
  if (t.includes("check")) return Clock;
  if (t.includes("smoking")) return Ban;
  if (t.includes("music")) return Music;
  if (t.includes("id")) return IdCard;
  if (t.includes("guest")) return Users;
  return ShieldCheck;
};

function mergeRanges(ranges) {
  if (!ranges?.length) return [];
  const sorted = ranges
    .map((r) => ({ from: new Date(r.from), to: new Date(r.to) }))
    .sort((a, b) => a.from - b.from);

  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    const nextDay = new Date(last.to);
    nextDay.setDate(nextDay.getDate() + 1);

    if (cur.from <= nextDay) {
      if (cur.to > last.to) last.to = cur.to;
    } else out.push(cur);
  }
  return out;
}

/* ---------------------------------------------------------------- */
/* PAGE */
/* ---------------------------------------------------------------- */

export default function RoomPage() {
  const { openAuth, user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [range, setRange] = useState(undefined);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const totalGuests = adults + children;

  // SAME GLOBAL DISABLED DATA AS HOMEPAGE (bookings + blackouts)
  const [bookedAll, setBookedAll] = useState([]);
  const [blackoutRanges, setBlackoutRanges] = useState([]);

  const [activeImage, setActiveImage] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);

  /* LOAD DATA */
  useEffect(() => {
    api.get(`/rooms/${id}`).then(({ data }) => setRoom(data));

    // bookings/blocked (global)
    api.get("/rooms/disabled/all").then(({ data }) =>
      setBookedAll(
        (data || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from || b.startDate),
          to: toDateOnlyFromAPIUTC(b.to || b.endDate),
        }))
      )
    );

    // blackouts (global)
    api.get("/blackouts").then(({ data }) =>
      setBlackoutRanges(
        (data || []).map((b) => ({
          from: toDateOnlyFromAPI(b.from),
          to: toDateOnlyFromAPI(b.to),
        }))
      )
    );
  }, [id]);

  const disabledAll = useMemo(
    () => mergeRanges([...blackoutRanges, ...bookedAll]),
    [blackoutRanges, bookedAll]
  );

  const allImages = useMemo(
    () => [room?.coverImage, ...(room?.galleryImages || [])].filter(Boolean),
    [room]
  );

  const avgRating = useMemo(() => {
    if (!room?.reviews?.length) return null;
    return (
      room.reviews.reduce((a, r) => a + r.rating, 0) / room.reviews.length
    ).toFixed(1);
  }, [room]);

  const goToCheckout = () => {
    if (!range?.from || !range?.to || totalGuests < 1) {
      toast.error("Please select dates and guests");
      return;
    }

    const bookingState = {
      roomId: room._id,
      startDate: range.from,
      endDate: range.to,
      guests: Number(totalGuests),
    };

    // 🔐 NOT LOGGED IN → OPEN OTP MODAL
    if (!user) {
      sessionStorage.setItem(
        "postAuthRedirect",
        JSON.stringify({
          redirectTo: "/checkout",
          bookingState,
        })
      );

      openAuth(); // ✅ ONLY THIS
      return;
    }

    // 🚨 PROFILE INCOMPLETE
    if (!user.profileComplete) {
      navigate("/complete-profile", {
        state: {
          redirectTo: "/checkout",
          bookingState,
        },
      });
      return;
    }

    // ✅ ALL GOOD
    navigate("/checkout", { state: bookingState });
  };

  if (!room) return null;

  function AccordionItem({ item }) {
    const [open, setOpen] = useState(false);

    return (
      <div
        className={`border rounded-xl px-4 transition ${open ? "bg-muted/40" : ""
          }`}
      >
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex justify-between items-center py-4 text-sm font-medium"
        >
          {item.q}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""
              }`}
          />
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 pb-4" : "max-h-0"
            }`}
        >
          <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-8 pb-28 md:pb-8">
        {/* BACK */}
        <Link to="/" className="text-sm opacity-70 hover:opacity-100">
          ← Back
        </Link>

        {/* IMAGE SLIDER WITH THUMBNAILS */}
        <div className="space-y-3">
          {/* MAIN IMAGE */}
          <div className="relative rounded-xl overflow-hidden">
            <img
              src={allImages[activeImage]}
              alt=""
              className="w-full h-[220px] sm:h-[320px] md:h-[420px] object-cover transition-all duration-300"
            />

            {/* NAV */}
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImage((p) =>
                      p === 0 ? allImages.length - 1 : p - 1
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-9 h-9 flex items-center justify-center shadow"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveImage((p) =>
                      p === allImages.length - 1 ? 0 : p + 1
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-9 h-9 flex items-center justify-center shadow"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* THUMBNAILS */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {allImages.map((img, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setActiveImage(i)}
                className={`shrink-0 rounded-lg overflow-hidden border-2 transition
                  ${i === activeImage
                    ? "border-primary"
                    : "border-transparent opacity-70 hover:opacity-100"
                  }`}
              >
                <img src={img} alt="" className="h-[64px] w-[96px] object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{room.name}</h1>
            {avgRating && (
              <div className="flex items-center gap-1 text-sm mt-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>{avgRating}</span>
                <span className="text-muted-foreground">
                  ({room.reviews.length} reviews)
                </span>
              </div>
            )}
          </div>

          <div className="text-lg sm:text-xl font-semibold">
            ₹{Number(room.pricePerNight).toLocaleString("en-IN")}/night
          </div>
        </div>

        {/* GRID */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* LEFT */}
          <div className="w-full md:w-[64%] space-y-10">
            {/* DESCRIPTION */}
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
              {room.description}
            </p>

            {/* AMENITIES */}
            <section>
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Amenities</h3>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(room.amenities || []).map((a) => {
                  const Icon = AMENITY_ICONS[a];
                  return (
                    <div
                      key={a}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/40 border"
                    >
                      {Icon && <Icon className="w-5 h-5 text-primary" />}
                      <span className="text-sm">{humanize(a)}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* HOUSE RULES */}
            <section>
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                House Rules
              </h3>

              <ul className="space-y-3 text-sm">
                {(room.houseRules || []).map((r, i) => {
                  const Icon = ruleIcon(r);
                  return (
                    <li key={i} className="flex gap-3">
                      <Icon className="w-4 h-4 text-primary mt-0.5" />
                      <span>{r}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* LOCATION */}
            <section>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Location</h3>

              <div className="flex gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                Gulposh Villa, Lonavala, Maharashtra
              </div>
            </section>

            {/* REVIEWS */}
            {room.reviews?.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold">
                    Guest Reviews
                  </h3>

                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{avgRating}</span>
                    <span className="text-gray-500">
                      ({room.reviews.length} reviews)
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {(showAllReviews ? room.reviews : room.reviews.slice(0, 2)).map(
                    (r, i) => (
                      <div
                        key={i}
                        className="border rounded-xl p-4 bg-white transition hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                            {r.name?.charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1">
                            <div className="font-medium text-sm">{r.name}</div>
                            <div className="flex items-center text-yellow-500 text-xs">
                              {"★".repeat(r.rating)}
                            </div>
                          </div>
                        </div>

                        {r.comment && (
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {r.comment}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>

                {room.reviews.length > 2 && !showAllReviews && (
                  <button
                    type="button"
                    onClick={() => setShowAllReviews(true)}
                    className="mt-4 w-full border rounded-lg py-2 text-sm hover:bg-muted transition"
                  >
                    View All Reviews
                  </button>
                )}

                {showAllReviews && (
                  <button
                    type="button"
                    onClick={() => setShowAllReviews(false)}
                    className="mt-4 w-full border rounded-lg py-2 text-sm hover:bg-muted transition"
                  >
                    Show Less
                  </button>
                )}
              </section>
            )}

            {/* FAQ */}
            <section>
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                Frequently Asked Questions
              </h3>

              <div className="space-y-3">
                {[
                  {
                    q: "What is included in the room price?",
                    a: "The room price includes accommodation, access to common areas, complimentary Wi-Fi, parking, and basic amenities. Meals can be added at an additional cost.",
                  },
                  {
                    q: "Is early check-in or late check-out available?",
                    a: "Early check-in or late check-out may be available on request, subject to availability.",
                  },
                  {
                    q: "Are pets allowed?",
                    a: "Pets are not allowed unless explicitly mentioned for the property.",
                  },
                  {
                    q: "What is the cancellation policy?",
                    a: "Free cancellation is available up to 7 days before check-in.",
                  },
                  {
                    q: "Is the property suitable for events?",
                    a: "Small gatherings are allowed with prior approval. Large events are not permitted.",
                  },
                ].map((item, i) => (
                  <AccordionItem key={i} item={item} />
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT – BOOKING CARD (✅ SAME AS HOMEPAGE CALENDAR) */}
          <div className="hidden md:block w-[34%] sticky top-24 h-fit border border-[#eadfd6] rounded-2xl p-5 space-y-5 bg-white">
            {/* PRICE */}
            <div className="text-center">
              <span className="text-2xl font-semibold">
                ₹{Number(room.pricePerNight).toLocaleString("en-IN")}
              </span>
              <span className="text-sm text-muted-foreground">/night</span>
            </div>

            {/* SAME CALENDAR RANGE AS HOMEPAGE (popover with date boxes) */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                CHECK IN / CHECK OUT
              </label>

              <CalendarRange
                value={range}
                onChange={setRange}
                disabledRanges={disabledAll} // ✅ global blocked+booked+blackouts
              />
            </div>

            {/* GUESTS */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                GUESTS (MAX {room.maxGuests || 10})
              </label>

              <GuestCounter
                label="Adults"
                description="Ages 13+"
                value={adults}
                min={1}
                max={room.maxGuests - children}
                onChange={setAdults}
              />

              <GuestCounter
                label="Children"
                description="Ages 2–12"
                value={children}
                min={0}
                max={room.maxGuests - adults}
                onChange={setChildren}
              />

              <p className="mt-2 text-xs text-muted-foreground">
                Total guests: <strong>{totalGuests}</strong>
              </p>
            </div>

            {/* BOOK NOW */}
            <Button
              onClick={goToCheckout}
              disabled={!range?.from || !range?.to || totalGuests < 1}
              className="
                w-full h-12 rounded-xl
                font-medium
                bg-primary text-primary-foreground
                hover:bg-primary/90
                active:scale-[0.99]
                transition
              "
            >
              Book Now
            </Button>

            {/* BENEFITS */}
            <div className="pt-2 space-y-2 text-sm text-green-700">
              <div>✓ Free cancellation up to 7 days</div>
              <div>✓ Instant confirmation</div>
              <div>✓ Best price guarantee</div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t px-4 py-3 flex items-center gap-3 z-50">
        <div className="flex-1">
          <div className="text-sm font-semibold">
            ₹{Number(room.pricePerNight).toLocaleString("en-IN")}/night
          </div>
        </div>
        <Button className="flex-1 h-11" onClick={goToCheckout}>
          Book Now
        </Button>
      </div>
    </>
  );
}
