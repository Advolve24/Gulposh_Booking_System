import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { api } from "../api/http";
import CalendarRange from "../components/CalendarRange";
import GuestCounter from "../components/GuestCounter";
import { amenityCategories } from "../data/aminities";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  ShieldCheck, Clock, Ban, Music, Flame,
  Users, IdCard, MapPin, Star, ChevronDown, ChevronLeft, ChevronRight, ArrowUpLeft
} from "lucide-react";
import { toDateOnlyFromAPI, toDateOnlyFromAPIUTC } from "../lib/date";
import { getWeekendOfferState } from "../lib/weekendOffer";
import { getDisplayedNightlyPrices } from "../lib/roomPricing";


const humanize = (v = "") =>
  v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const AMENITY_ICONS = amenityCategories.reduce((icons, category) => {
  category.items.forEach((item) => {
    icons[item.id] = item.icon;
  });
  return icons;
}, {});

const ruleIcon = (text = "") => {
  const t = text.toLowerCase();
  if (t.includes("check")) return Clock;
  if (t.includes("smoking")) return Ban;
  if (t.includes("music")) return Music;
  if (t.includes("id")) return IdCard;
  if (t.includes("guest")) return Users;
  return ShieldCheck;
};

function minusOneDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

function mergeRanges(ranges) {
  if (!ranges?.length) return [];
  const sorted = ranges
    .map((r) => ({ from: new Date(r.from), to: new Date(r.to) }))
    .sort((a, b) => a.from - b.from);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur.from <= last.to) {
      if (cur.to > last.to) last.to = cur.to;
    } else {
      out.push(cur);
    }
  }

  return out;
}

function clampGuestSelection(adultsValue, childrenValue, maxGuests) {
  const safeMax = Number(maxGuests || 0);
  const safeAdults = Math.max(0, Number(adultsValue || 0));
  const safeChildren = Math.max(0, Number(childrenValue || 0));

  if (safeMax <= 0) {
    return {
      adults: Math.max(1, safeAdults || 1),
      children: 0,
    };
  }

  const nextAdults = Math.min(Math.max(1, safeAdults || 1), safeMax);
  const remainingCapacity = Math.max(0, safeMax - nextAdults);
  const nextChildren = Math.min(safeChildren, remainingCapacity);

  return {
    adults: nextAdults,
    children: nextChildren,
  };
}

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

function RoomNightlyPrices({ room, guests = 0, align = "right", compact = false }) {
  const { weekdayPrice, weekendPrice, baseGuests, extraGuestCount } =
    getDisplayedNightlyPrices(room, guests);
  const wrapperClass =
    align === "center"
      ? "text-center"
      : align === "left"
        ? "text-left"
        : "text-left sm:text-right";
  const priceClass = compact ? "text-xl font-semibold" : "text-lg sm:text-xl font-semibold";
  const subtitle = extraGuestCount > 0 ? `for ${guests} guests` : `for up to ${baseGuests} guests`;

  return (
    <div className={`flex items-center justify-between ${wrapperClass}`}>
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Weekdays
          {extraGuestCount === 0 ? <span className="ml-1 normal-case">starting from</span> : null}
        </div>
        <div className={priceClass}>
          {formatCurrency(weekdayPrice)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">/N</span>
        </div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>

      <div className="w-[1px] border h-[28px]">

      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Weekend
          <span className="ml-1 normal-case">(Fri, Sat, Sun nights)</span>
          {extraGuestCount === 0 ? <span className="ml-1 normal-case">starting from</span> : null}
        </div>
        <div className={priceClass}>
          {formatCurrency(weekendPrice)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">/N</span>
        </div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}

function BookingCard({
  room,
  range,
  setRange,
  adults,
  setAdults,
  children,
  setChildren,
  disabledAll,
  goToCheckout,
  weekendOffer,
  onCapacityMaxAttempt,
}) {
  const totalGuests = adults + children;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* SCROLLABLE CONTENT */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-1">
        {/* DATES */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground">
            CHECK IN / CHECK OUT
          </label>
          <CalendarRange
            roomId={room._id}
            value={range}
            onChange={setRange}
            disabledRanges={disabledAll}
            showWeekdayInBox
            pricing={{
              weekdayPrice: getDisplayedNightlyPrices(room, totalGuests).weekdayPrice,
              weekendPrice: getDisplayedNightlyPrices(room, totalGuests).weekendPrice,
            }}
          />
        </div>

        {/* GUESTS */}
        <RoomGuestPopover
          room={room}
          adults={adults}
          setAdults={setAdults}
          children={children}
          setChildren={setChildren}
          onCapacityMaxAttempt={onCapacityMaxAttempt}
        />

        {weekendOffer?.canSuggest && (
          <div className="rounded-[22px] border-2 border-dashed border-[#f5be23] bg-[radial-gradient(circle_at_top_right,_rgba(255,224,130,0.45),_rgba(255,249,219,0.96)_42%,_rgba(255,243,201,0.92)_100%)] p-4 text-[#312312] shadow-[0_10px_28px_-18px_rgba(201,138,0,0.9)]">
            <span className="limited-offer-pill inline-flex items-center gap-1 rounded-full bg-[#ffc928] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4a3200]">
              <Flame className="h-3.5 w-3.5" />
              Limited Offer
            </span>
            <p className="mt-1 text-[16px] font-semibold leading-5 text-[#1f1406]">
              {weekendOffer.suggestionTitle}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[#6c5a35]">
              {weekendOffer.suggestionBodyPrefix} {weekendOffer.suggestedCheckoutLabel} to unlock the better weekend offer.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-1 h-10 rounded-xl border border-[#1f1406] bg-white px-5 text-[14px] font-semibold text-[#1f1406] hover:bg-[#fff7df]"
              onClick={() =>
                setRange({
                  from: range?.from || null,
                  to: weekendOffer.suggestedCheckout,
                })
              }
            >
              {weekendOffer.suggestionButtonLabel}
            </Button>
          </div>
        )}

        {weekendOffer?.eligible && (
          <div className="rounded-2xl border border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-4 text-sm text-green-800 shadow-sm">
            <p className="font-semibold">
              {weekendOffer.percent}% weekend discount applied
            </p>
            <p className="mt-1 text-xs text-green-700">
              Active for {weekendOffer.appliedTier} weekend night{weekendOffer.appliedTier === 1 ? "" : "s"} in your selected stay.
            </p>
          </div>
        )}




        {/* BENEFITS */}
        <div className="space-y-2 text-sm text-green-700">
          <div>✓ Free cancellation up to 7 days</div>
          <div>✓ Instant confirmation</div>
          <div>✓ Best price guarantee</div>
        </div>
      </div>

      {/* STICKY FOOTER BUTTON */}
      <div className="sticky bottom-0 bg-white pt-3">
        <Button
          onClick={goToCheckout}
          disabled={!range?.from || !range?.to || totalGuests < 1}
          className="
            w-full
            h-12
            rounded-xl
            text-base
            font-semibold
            bg-primary
            hover:bg-primary/90
            shadow-md
          "
        >
          Book Now
        </Button>
      </div>
    </div>
  );
}

function RoomGuestPopover({
  room,
  adults,
  setAdults,
  children,
  setChildren,
  onCapacityMaxAttempt,
}) {
  const totalGuests = adults + children;

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        GUESTS (MAX {room.maxGuests || 10})
      </label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="mt-2 h-16 w-full justify-between rounded-xl border-[#eadfd8] bg-white px-4"
          >
            <div className="text-left">
              <div className="text-[16px] font-semibold text-[#2A201B]">
                {totalGuests} guest{totalGuests === 1 ? "" : "s"}
              </div>
            </div>
            <Users className="h-4 w-4 text-[#a11d2e]" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[350px] rounded-2xl p-4"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-0">
            <GuestCounter
              label="Adults"
              description="Ages 13+"
              value={adults}
              min={1}
              max={room.maxGuests - children}
              onChange={setAdults}
              onMaxAttempt={onCapacityMaxAttempt}
            />

            <div className="my-3 h-px bg-border" />

            <GuestCounter
              label="Children"
              description="Ages 2-12"
              value={children}
              min={0}
              max={room.maxGuests - adults}
              onChange={setChildren}
              onMaxAttempt={onCapacityMaxAttempt}
            />

            <p className="mt-2 text-xs text-muted-foreground">
              Total guests: <strong>{totalGuests}</strong>
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}




export default function RoomPage() {
  const location = useLocation();
  const { openAuth, user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const navState = location.state;
  const initialSearch = navState || null;

  const [room, setRoom] = useState(null);
  const [allRooms, setAllRooms] = useState([]);
  const [range, setRange] = useState(() => {
    if (!initialSearch?.range?.from || !initialSearch?.range?.to) return undefined;

    return {
      from: new Date(initialSearch.range.from),
      to: new Date(initialSearch.range.to),
    };
  });

  const [adults, setAdults] = useState(initialSearch?.adults ?? 1);
  const [children, setChildren] = useState(initialSearch?.children ?? 0);



  const totalGuests = adults + children;

  const [bookedAll, setBookedAll] = useState([]);
  const [blackoutRanges, setBlackoutRanges] = useState([]);

  const [activeImage, setActiveImage] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [capacityPopupOpen, setCapacityPopupOpen] = useState(false);
  const [discountConfig, setDiscountConfig] = useState({
    weekendDiscountEnabled: false,
    twoWeekendNightsDiscountPercent: 0,
    threeWeekendNightsDiscountPercent: 0,
  });

  const handleBack = () => {
    navigate("/", { state: { scrollToResults: true } });
  };



  // useEffect(() => {
  //   // If user navigated without search state (e.g. back + new room)
  //   if (!location.state) {
  //     setRange(undefined);
  //     setAdults(1);
  //     setChildren(0);
  //   }
  // }, [id]);


  useEffect(() => {
    if (range?.from && typeof range.from === "string") {
      setRange({
        from: new Date(range.from),
        to: new Date(range.to),
      });
    }
  }, []);


  useEffect(() => {
    api.get(`/rooms/${id}`).then(({ data }) => setRoom(data));
    api.get("/rooms").then(({ data }) => setAllRooms(data || []));

    api.get("/rooms/disabled/all").then(({ data }) =>
      setBookedAll(
        (data || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from || b.startDate),
          to: minusOneDay(toDateOnlyFromAPIUTC(b.to || b.endDate)),
        }))
      )
    );

    api.get("/blackouts").then(({ data }) =>
      setBlackoutRanges(
        (data || []).map((b) => ({
          from: toDateOnlyFromAPI(b.from),
          to: toDateOnlyFromAPI(b.to),
        }))
      )
    );

    api.get("/tax").then(({ data }) => {
      setDiscountConfig({
        weekendDiscountEnabled: Boolean(data.weekendDiscountEnabled),
        twoWeekendNightsDiscountPercent: Number(
          data.twoWeekendNightsDiscountPercent || 0
        ),
        threeWeekendNightsDiscountPercent: Number(
          data.threeWeekendNightsDiscountPercent || 0
        ),
      });
    }).catch(() => {
      setDiscountConfig({
        weekendDiscountEnabled: false,
        twoWeekendNightsDiscountPercent: 0,
        threeWeekendNightsDiscountPercent: 0,
      });
    });
  }, [id]);

  useEffect(() => {
    if (!room?.maxGuests) return;

    const source = navState || null;

    if (source?.range?.from && source?.range?.to) {
      setRange({
        from: new Date(source.range.from),
        to: new Date(source.range.to),
      });
    }

    const clamped = clampGuestSelection(
      source?.adults ?? adults,
      source?.children ?? children,
      room.maxGuests
    );

    setAdults(clamped.adults);
    setChildren(clamped.children);
  }, [id, room?.maxGuests]);

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

  const weekendOffer = useMemo(() => {
    if (!range?.from || !range?.to) {
      return null;
    }
    return getWeekendOfferState(range, discountConfig);
  }, [discountConfig, range]);

  const recommendedRooms = useMemo(() => {
    if (!room?._id) return [];

    return allRooms
      .filter(
        (candidate) =>
          candidate._id !== room._id &&
          Number(candidate.maxGuests || 0) > Number(room.maxGuests || 0)
      )
      .sort((a, b) => Number(a.maxGuests || 0) - Number(b.maxGuests || 0));
  }, [allRooms, room]);

  const savedBookingSearch = useMemo(
    () => ({
      range,
      adults,
      children,
    }),
    [range, adults, children]
  );

  const roomSearch = useMemo(() => {
    const params = new URLSearchParams();

    if (range?.from && range?.to) {
      params.set("from", new Date(range.from).toISOString());
      params.set("to", new Date(range.to).toISOString());
    }

    if (totalGuests > 0) {
      params.set("guests", String(totalGuests));
    }

    const query = params.toString();
    return query ? `?${query}` : "";
  }, [range, totalGuests]);

  const handleCapacityMaxAttempt = () => {
    setCapacityPopupOpen(true);
  };

  const goToSuggestedRoom = (targetRoomId) => {
    sessionStorage.setItem("searchParams", JSON.stringify(savedBookingSearch));
    setCapacityPopupOpen(false);
    navigate(`/room/${targetRoomId}${roomSearch}`, {
      state: savedBookingSearch,
    });
  };

  const goToEntireVilla = () => {
    sessionStorage.setItem("searchParams", JSON.stringify(savedBookingSearch));
    setCapacityPopupOpen(false);
    navigate("/entire-villa-form");
  };

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
      adults,
      children,
    };

    if (!user) {
      sessionStorage.setItem(
        "postAuthRedirect",
        JSON.stringify({
          redirectTo: "/checkout",
          bookingState,
        })
      );

      openAuth();
      return;
    }

    if (!user.profileComplete) {
      navigate("/complete-profile", {
        state: {
          redirectTo: "/checkout",
          bookingState,
        },
      });
      return;
    }

    navigate("/checkout", { state: bookingState });
  };

  if (!room) return null;

  function AccordionItem({ item, open, onToggle }) {
    return (
      <div
        className={`border rounded-xl px-4 transition ${open ? "bg-muted/40" : ""
          }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex justify-between items-center py-4 text-sm font-medium text-left"
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
          <p className="text-sm text-gray-600 leading-relaxed text-left">
            {item.a}
          </p>
        </div>
      </div>
    );
  }


  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-3 pb-28 md:pb-8">
        {/* BACK */}
        <button
          onClick={handleBack}
          className="text-l hover:opacity-100 bg-black/10 p-2 rounded-[8px] pr-4 w-fit flex gap-1"
        >
          <ArrowUpLeft className="text-black/60" />
          Back
        </button>

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
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-11 h-11 flex items-center justify-center shadow"
                >
                  <ChevronLeft />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveImage((p) =>
                      p === allImages.length - 1 ? 0 : p + 1
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-11 h-11 flex items-center justify-center shadow"
                >
                  <ChevronRight />
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
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 md:items-center">
          <div className="mt-4">
            <h1 className="text-xl sm:text-2xl font-bold">{room.name}</h1>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              Upto {room.maxGuests} guests
            </span>
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

          <div className="rounded-2xl border border-[#eadfd6] bg-white p-4 md:w-[34%] w-full ">
              <RoomNightlyPrices room={room} guests={totalGuests} align="left" compact />
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
                <a href="https://maps.google.com/?q=House+no+32+A,+Dnyandeep+Co-Op+Housing+Society,+Villa+Gulposh+Vidyasagar+Properties+Pvt+Ltd,+Kirawali,+Deulwadi,+Maharashtra+410201" target="_blank" rel="noopener noreferrer">
                   Villa Gulposh Vidyasagar Properties Pvt Ltd. House no 32 A, Dnyandeep<br/> Society, Kirawali, Karjat - 410201
                </a>
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
                    q: "How do I book Villa Gulposh?",
                    a: "You can book directly through our booking portal: booking.villagulposh.com. Select dates, enter guest details, and complete payment to confirm the booking.",
                  },
                  {
                    q: "Is my booking confirmed immediately after payment?",
                    a: "Yes—once payment is successful and the booking confirmation is generated on the portal, your booking is considered confirmed.",
                  },
                  {
                    q: "What payment methods do you accept?",
                    a: "We accept online payments via Razorpay (UPI, cards, netbanking, etc. as supported by Razorpay).",
                  },
                  {
                    q: "What are the check-in and check-out timings?",
                    a: "Check-in: 12:00 PM\n\nCheck-out: 10:00 AM",
                  },
                  {
                    q: "Can I cancel my booking from the portal?",
                    a: "Yes. Cancellation is available directly on booking.villagulposh.com (Cancel Booking option).",
                  },
                ].map((item, i) => (
                  <AccordionItem
                    key={i}
                    item={item}
                    open={openFaqIndex === i}
                    onToggle={() =>
                      setOpenFaqIndex(openFaqIndex === i ? null : i)
                    }
                  />
                ))}

              </div>
            </section>
          </div>

          {/* RIGHT – BOOKING CARD (✅ SAME AS HOMEPAGE CALENDAR) */}
          <div className="hidden md:block w-[34%] sticky top-24 h-fit space-y-4">



            <div className="border border-[#eadfd6] rounded-2xl p-5 space-y-5 bg-white">
              {/* SAME CALENDAR RANGE AS HOMEPAGE (popover with date boxes) */}
              <div>
              <label className="text-xs font-medium text-muted-foreground">
                CHECK IN / CHECK OUT
              </label>

              <CalendarRange
                value={range}
                onChange={setRange}
                disabledRanges={disabledAll}
                showWeekdayInBox
                pricing={{
                  weekdayPrice: getDisplayedNightlyPrices(room, totalGuests).weekdayPrice,
                  weekendPrice: getDisplayedNightlyPrices(room, totalGuests).weekendPrice,
                }}
              />
              </div>

            {/* GUESTS */}
            <RoomGuestPopover
              room={room}
              adults={adults}
              setAdults={setAdults}
              children={children}
              setChildren={setChildren}
              onCapacityMaxAttempt={handleCapacityMaxAttempt}
            />

            {weekendOffer?.canSuggest && (
              <div className="rounded-[22px] border-2 border-dashed border-[#f5be23] bg-[radial-gradient(circle_at_top_right,_rgba(255,224,130,0.45),_rgba(255,249,219,0.96)_42%,_rgba(255,243,201,0.92)_100%)] p-4 text-[#312312] shadow-[0_10px_28px_-18px_rgba(201,138,0,0.9)]">
                <span className="limited-offer-pill inline-flex items-center gap-1 rounded-full bg-[#ffc928] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4a3200]">
                  <Flame className="h-3.5 w-3.5" />
                  Limited Offer
                </span>
                <p className="mt-1 text-[16px] font-semibold leading-5 text-[#1f1406]">
                  {weekendOffer.suggestionTitle}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#6c5a35]">
                  {weekendOffer.suggestionBodyPrefix} {weekendOffer.suggestedCheckoutLabel} to unlock the better weekend offer.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-10 rounded-xl border border-[#1f1406] bg-white px-5 text-[15px] font-semibold text-[#1f1406] hover:bg-[#fff7df]"
                  onClick={() =>
                    setRange({
                      from: range?.from || null,
                      to: weekendOffer.suggestedCheckout,
                    })
                  }
                >
                  {weekendOffer.suggestionButtonLabel}
                </Button>
              </div>
            )}

            {weekendOffer?.eligible && (
              <div className="rounded-2xl border border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-4 text-sm text-green-800 shadow-sm">
                <p className="font-semibold">
                  {weekendOffer.percent}% weekend discount applied
                </p>
                <p className="mt-1 text-xs text-green-700">
                  Active for {weekendOffer.appliedTier} weekend night{weekendOffer.appliedTier === 1 ? "" : "s"} in your selected stay.
                </p>
              </div>
            )}

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

            <div className="border rounded-[12px]">
              <p className="text-[16px] font-[600] text-green-600 p-3 flex items-center justify-center">
                <ShieldCheck className="inline w-5 h-5 mr-1 " />
                100% safe and secure payments.
              </p>

              <div className="border-t flex items-center justify-between">
                <img src="/verifiedbyvisa.png" alt="Verified by Visa" className="w-full h-11 object-contain p-2" />
                <img src="/mastercard.png" alt="Mastercard" className="w-full h-10 object-contain p-2" />
                <img src="/Rupay.png" alt="Rupay" className="w-full h-8 object-contain p-2" />
                <img src="/Upi.png" alt="UPI" className="w-full h-8 object-contain p-2" />
              </div>
            </div>

            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY FOOTER */}
      <div
        className="
    fixed bottom-0 left-0 right-0 md:hidden
    bg-white border-t
    px-4 py-3
    z-50
  "
      >
        <div className="flex items-center gap-3 max-w-md mx-auto">
          {/* PRICE (30%) */}
          <div className="w-[35%]">
            <div className="text-xs text-muted-foreground">Price</div>
            <div className="text-xs font-semibold leading-tight">
              Weekday: {formatCurrency(getDisplayedNightlyPrices(room, totalGuests).weekdayPrice)}
            </div>
            <div className="text-xs font-semibold leading-tight">
              Weekend: {formatCurrency(getDisplayedNightlyPrices(room, totalGuests).weekendPrice)}
            </div>
          </div>

          {/* BUTTON (70%) */}
          <Button
            onClick={() => setShowDrawer(true)}
            className="
        w-[60%]
        h-12
        rounded-xl
        text-base
        font-semibold
        bg-primary
        hover:bg-primary/90
        shadow-md
      "
          >
            Book Now
          </Button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      <Drawer open={showDrawer} onOpenChange={setShowDrawer}>
      <DrawerContent
          className="
      flex
      h-[65vh]
      max-h-[65vh]
      flex-col
      rounded-t-2xl
      bg-white
      pt-3
      pb-4
      overflow-hidden
    "
        >
          {/* HEADER */}
          <DrawerHeader
            className="
    relative
    shrink-0
    px-4
    mb-2
    flex
    items-center
  "
          >
            {/* CENTERED TITLE */}
            <DrawerTitle
              className="
      absolute
      left-1/2
      -translate-x-1/2
      text-base
      font-semibold
    "
            >
              Complete your booking
            </DrawerTitle>

            {/* CLOSE BUTTON (RIGHT ALIGNED) */}
            <DrawerClose className="ml-auto">
              <X className="w-5 h-5 text-muted-foreground" />
            </DrawerClose>
          </DrawerHeader>


          {/* CENTERED BOOKING CARD (NO EDGE TOUCH) */}
          <div className="min-h-0 flex-1 overflow-hidden px-4">
            <div className="mx-auto flex h-full min-h-0 max-w-[330px] flex-col overflow-hidden">
              <BookingCard
                room={room}
                range={range}
                setRange={setRange}
                adults={adults}
                setAdults={setAdults}
                children={children}
                setChildren={setChildren}
                disabledAll={disabledAll}
                goToCheckout={goToCheckout}
                weekendOffer={weekendOffer}
                onCapacityMaxAttempt={handleCapacityMaxAttempt}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {capacityPopupOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setCapacityPopupOpen(false)}
          />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setCapacityPopupOpen(false)}
              className="absolute right-4 top-4 z-10 h-9 w-9 rounded-full bg-black/5 text-lg text-black/70 transition hover:bg-black/10"
            >
              X
            </button>

            <div className="border-b border-[#eadfd6] px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ba081c]">
                Room Capacity Reached
              </div>
              <h3 className="mt-2 text-2xl font-semibold text-[#2A201B]">
                This room&apos;s max guest capacity is {room.maxGuests}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#6d5c52]">
                Please select another room for more guests, or choose the entire villa for your group.
              </p>
            </div>

            <div className="px-6 py-6">
              <div className="space-y-3">
                {recommendedRooms.map((candidate) => (
                  <button
                    key={candidate._id}
                    type="button"
                    onClick={() => goToSuggestedRoom(candidate._id)}
                    className="flex w-full items-center justify-between rounded-2xl border border-[#eadfd6] bg-[#fffaf7] px-4 py-4 text-left transition hover:border-[#ba081c] hover:bg-[#fff4f1]"
                  >
                    <div>
                      <div className="text-base font-semibold text-[#2A201B]">
                        {candidate.name}
                      </div>
                      <div className="text-sm text-[#6d5c52]">
                        Max guest capacity: {candidate.maxGuests}
                      </div>
                    </div>
                    <ArrowUpLeft className="h-4 w-4 text-[#ba081c]" />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={goToEntireVilla}
                  className="flex w-full items-center justify-between rounded-2xl bg-[#ba081c] px-4 py-4 text-left text-white transition hover:bg-[#a00718]"
                >
                  <div>
                    <div className="text-base font-semibold">
                      Entire Villa
                    </div>
                    <div className="text-sm text-white/85">
                      Reserve all rooms for larger groups
                    </div>
                  </div>
                  <ArrowUpLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
