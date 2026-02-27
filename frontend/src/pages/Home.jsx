import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/http";
import RoomCard from "../components/RoomCard";
import CalendarRange from "../components/CalendarRange";
import GuestCounter from "@/components/GuestCounter";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";


import {
  MapPin,
  Star,
  Search,
  HeartHandshake,
  Sparkles,
  ShieldCheck,
  MapPinned,
  UserRound,
  Wifi,
  ParkingCircle,
  CookingPot,
  CalendarDays,
  Users,
  CreditCard,
  PartyPopper,
  ArrowRight,
  Phone,
  Mail,
} from "lucide-react";

import { motion, useInView } from "framer-motion";

import {
  toDateOnly,
  toDateOnlyFromAPI,
  toDateOnlyFromAPIUTC,
} from "../lib/date";

/* ================= HELPERS ================= */

function minusOneDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

function mergeRanges(ranges) {
  if (!ranges || !ranges.length) return [];
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

const cx = (...a) => a.filter(Boolean).join(" ");

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay: i * 0.08 },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: "easeOut" } },
};

function useOnceInView(margin = "-120px") {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin });
  return { ref, inView };
}

function rangeHasConflict(selected, blockedRanges) {
  if (!selected?.from || !selected?.to) return false;
  const start = toDateOnly(selected.from);
  const end = toDateOnly(selected.to);
  return blockedRanges.some((b) => {
    const bStart = toDateOnly(b.from);
    const bEnd = toDateOnly(b.to);
    return start < bEnd && end > bStart;
  });
}


export default function Home() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [disabledAll, setDisabledAll] = useState([]);
  const [range, setRange] = useState();
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const location = useLocation();

  const totalGuests = adults + children;
  const hasValidRange = !!(range?.from && range?.to);
  const hasGuests = totalGuests > 0;
  const [showVillaPopup, setShowVillaPopup] = useState(false);
  const [isRangeInvalid, setIsRangeInvalid] = useState(false);

  const heroRef = useRef(null);

  const why = useOnceInView();
  const process = useOnceInView();
  const roomsSec = useOnceInView();
  const cta = useOnceInView();
  const footer = useOnceInView("-40px");


  useEffect(() => {
    api.get("/rooms").then(({ data }) => setRooms(data || []));

    (async () => {
      try {
        const [bookingsRes, blackoutsRes] = await Promise.all([
          api.get("/rooms/disabled/all"),
          api.get("/blackouts"),
        ]);

        const bookings = (bookingsRes.data || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from || b.startDate),
          to: minusOneDay(toDateOnlyFromAPIUTC(b.to || b.endDate)),
        }));

        const blackouts = (blackoutsRes.data || []).map((b) => ({
          from: toDateOnlyFromAPI(b.from),
          to: toDateOnlyFromAPI(b.to),
        }));

        setDisabledAll(mergeRanges([...bookings, ...blackouts]));
      } catch (err) {
        console.error("failed to load disabled ranges", err);
      }
    })();
  }, []);

  useEffect(() => {
  if (location.state?.scrollToResults) {
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 200);
  }
}, [location.state]);


  const resetFilters = () => {
    setRange(undefined);
    setAdults(0);
    setChildren(0);
    setIsRangeInvalid(false);
    sessionStorage.removeItem("searchParams");
    heroRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    toast.success("Filters cleared");
  };

  useEffect(() => {
    if (!range) setIsRangeInvalid(false);
  }, [range]);

  const filteredRooms = useMemo(() => {
    if (!hasValidRange || !hasGuests) {
      return rooms;
    }
    if (isRangeInvalid) {
      return rooms;
    }
    const s = toDateOnly(range.from);
    const e = toDateOnly(range.to);
    const g = Number(totalGuests);
    return rooms.filter((r) => {
      const cap = Number(r.maxGuests || 1);
      if (g > cap) return false;
      const conflict = disabledAll.some(
        (b) => s < b.to && e > b.from
      );
      return !conflict;
    });

  }, [rooms, disabledAll, range, totalGuests, hasValidRange, hasGuests, isRangeInvalid]);

  const onSearch = () => {
    if (!hasValidRange || !hasGuests) {
      toast.error("Please select dates and guests");
      return;
    }
    if (isRangeInvalid) {
      toast.error("Your selected stay includes unavailable dates. Please adjust the dates.");
      return;
    }
    sessionStorage.setItem(
      "searchParams",
      JSON.stringify({
        range,
        adults,
        children,
      })
    );
    document.getElementById("results")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("searchParams");
    if (!saved) return;

    const parsed = JSON.parse(saved);

    if (parsed?.range?.from && parsed?.range?.to) {
      setRange({
        from: new Date(parsed.range.from),
        to: new Date(parsed.range.to),
      });
    }

    if (typeof parsed?.adults === "number") setAdults(parsed.adults);
    if (typeof parsed?.children === "number") setChildren(parsed.children);
  }, []);


  useEffect(() => {
    if (!range?.from || !range?.to) return;
    if (adults === 0 && children === 0) return;

    sessionStorage.setItem(
      "searchParams",
      JSON.stringify({
        range,
        adults,
        children,
      })
    );
  }, [range, adults, children]);


  useEffect(() => {
    if (totalGuests > 10) {
      setShowVillaPopup(true);
    } else {
      setShowVillaPopup(false);
    }
  }, [totalGuests]);


  const handleRangeSelect = (newRange) => {
    setRange(newRange);
    if (!newRange?.from || !newRange?.to) {
      setIsRangeInvalid(false);
      return;
    }
    const conflict = rangeHasConflict(newRange, disabledAll);
    if (conflict) {
      if (!isRangeInvalid) {
        toast.error("Some selected dates are already booked. Please adjust your stay.");
      }
      setIsRangeInvalid(true);
    } else {
      setIsRangeInvalid(false);
    }
  };


  return (
    <>
      <Helmet>
        <title>Villa Booking in Karjat | Luxury Private Stays with Gulposh</title>
        <meta
          name="description"
          content="Villa booking in Karjat at Gulposh, a luxury private stay for families and groups. Entire villa with modern amenities and instant confirmation." />
        <link rel="canonical" href="https://booking.villagulposh.com/" />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LodgingBusiness",
            "name": "Villa Booking in Karjat | Luxury Private Stays with Gulposh",
            "url": "https://booking.villagulposh.com/",
            "logo": "https://booking.villagulposh.com/assets/logo.png",
            "description": "Villa booking in Karjat at Gulposh, a luxury private stay for families and groups. Entire villa with modern amenities and instant confirmation.",
            "telephone": "+91 98200 74617",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Karjat",
              "addressRegion": "MH",
              "addressCountry": "IN"
            },
            "priceRange": "₹₹₹",
            "sameAs": [
              "https://www.instagram.com/villagulposh",
              "https://www.facebook.com/villagulposh/",
              "https://www.linkedin.com/company/villagulposh/"
            ],
            "potentialAction": {
              "@type": "ReserveAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://booking.villagulposh.com/",
                "inLanguage": "en-IN",
                "actionPlatform": [
                  "https://schema.org/DesktopWebPlatform",
                  "https://schema.org/MobileWebPlatform"
                ]
              },
              "result": {
                "@type": "LodgingReservation"
              }
            }
          })}
        </script>

      </Helmet>





      <div className="min-h-screen bg-[#fffaf7] text-[#2A201B]">
        <section
          ref={heroRef}
          className="
    relative isolate overflow-hidden
    w-full
    items-center pt-10 pb-10 sm:pt-24 sm:pb-24"
        >

          <div className="absolute inset-0 -z-10 " >
            <motion.img
              src="/EntireVilla.webp"
              alt="Gulposh Villa"
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 1.9,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-[#8a807948]" />
          </div>

          <div className="mx-auto max-w-7xl px-4 text-center">


            {/* LOCATION PILL */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mx-auto flex justify-center"
            >
              <div
                className="
          inline-flex items-center gap-2
          rounded-full
          bg-white/15 backdrop-blur
          px-4 py-1.5
          text-xs text-white
          ring-1 ring-white/90
        "
              >
                <MapPin className="h-3.5 w-3.5 text-white" />
                <span>Luxurious Villa in Karjat</span>
                <span className="opacity-50">•</span>
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-white" />
                  <span>4.9</span>
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1 }}
              className="mt-6 text-center "
            >
              <h1
                className="
      text-[30px] md:text-[45px]
      leading-[1.02]
      text-white
      font-heading
      tracking-tight
      font-semibold
    "
              >
                Experience Luxury
                <span className="block text-white mt-2">
                  Amidst Nature
                </span>
              </h1>

              <p className="mt-4 max-w-xl mx-auto text-[13px] sm:text-[16px]  text-white/90 font-sans ">
                Discover an exclusive retreat where elegance meets tranquility.<br />
                Book your stay at Gulposh Villa today.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.02, delay: 0.25 }}
              className="
    mt-14
    flex flex-col
    items-center
    justify-center
    px-4
  "
            >
              <div
                className="
      w-full max-w-6xl
      mx-auto
      rounded-3xl
       bg-white/10 backdrop-blur-sm
      shadow-[0_30px_80px_-35px_rgba(0,0,0,0.6)]
      ring-1 ring-black/5
      p-4
    "
              >
                <div
                  className="
        grid grid-cols-1
        gap-2
        md:grid-cols-[1.3fr_1fr_auto_auto]
        md:items-end
      "
                >
                  {/* CHECK IN / OUT */}
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-white font-semibold">
                      CHECK IN / CHECK OUT
                    </div>
                    <div className="mt-2">
                      <CalendarRange
                        value={range}
                        onChange={(newRange) => handleRangeSelect(newRange)}
                        disabledRanges={disabledAll}
                      />
                      {/* <BookingCalendar
                      onSelect={(range) => {
                        console.log("CHECK-IN:", range.from);
                        console.log("CHECK-OUT:", range.to);
                      }}
                    /> */}

                    </div>
                  </div>

                  {/* GUESTS */}
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-white font-semibold">
                      GUESTS
                    </div>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="
                mt-2 h-14 w-full
                justify-between
                rounded-xl
                bg-white
                border-[#eadfd8]
                hover:bg-[#fffaf7]
              "
                        >
                          {totalGuests > 0
                            ? `${totalGuests} guest${totalGuests > 1 ? "s" : ""}`
                            : "Select guests"}
                          <Users className="h-4 w-4 text-[#a11d2e]" />
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent
                        className="w-[350px] p-4 rounded-2xl"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onCloseAutoFocus={(e) => e.preventDefault()}
                        onInteractOutside={(e) => {
                          const target = e.target;
                          if (target.closest("[data-guest-popover]")) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <div data-guest-popover>
                        <GuestCounter
                          label="Adults"
                          description="Ages 13 or above"
                          value={adults}
                          min={0}
                          max={20}
                          onChange={setAdults}
                        />

                        <div className="my-3 h-px bg-border" />

                        <GuestCounter
                          label="Children"
                          description="Ages 2–12"
                          value={children}
                          min={0}
                          max={20 - adults}
                          onChange={setChildren}
                        />

                        <div className="my-4 h-px bg-border" />

                        <div className="rounded-xl border border-[#eadfd8] bg-[#fff8f5] p-3">
                          <div className="text-[12px] text-[#5c4b42] leading-snug">
                            Planning a stay for more than <strong>10 guests</strong>?
                            <br />
                            For large groups, we recommend reserving the <strong>Entire Gulposh Villa</strong>
                            for better comfort and privacy.
                          </div>

                          <Button
                            size="sm"
                            className="mt-3 w-full rounded-[8px] bg-[#a11d2e] hover:bg-[#8e1827] text-white text-[12px] h-9"
                            onClick={() => {
                              sessionStorage.setItem(
                                "searchParams",
                                JSON.stringify({ range, adults, children })
                              );
                              navigate("/entire-villa-form");
                            }}
                          >
                            Enquire Entire Villa
                          </Button>
                        </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* CTA */}
                  <Button
                    onClick={onSearch}
                    className="
          h-14
          w-full md:w-auto
          rounded-xl
          bg-[#941b2b]
          hover:bg-[#8e1827]
          text-white
          px-7
          shadow-lg shadow-[#a11d2e]/20
          flex items-center justify-center gap-2
        "
                  >
                    Check Availability
                    <Search className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="
    h-14
    w-full md:w-auto
    rounded-xl
    border-white/60
    text-black
    hover:bg-white hover:text-black
    backdrop-blur-sm
  "
                  >
                    Reset
                  </Button>
                </div>
              </div>
              {/* ================= STATS ================= */}
              <div className="hidden sm:block mt-[3.5rem] w-[55%] mx-auto px-2">
                <div
                  className="
      grid
      grid-cols-2
      sm:grid-cols-4
      gap-6
      text-white
    "
                >
                  {[
                    ["500+", "Happy Guests"],
                    ["4.9", "Rating"],
                    ["3", "Room Packages"],
                    ["24/7", "Support"],
                  ].map(([value, label], i) => (
                    <div
                      key={i}
                      className="
          flex
          flex-col
          items-center
          justify-center
          text-center

          rounded-2xl
          px-6
          py-5

          bg-white/10
          backdrop-blur-sm
          ring-1 ring-white/20

          shadow-[0_12px_40px_-20px_rgba(0,0,0,0.6)]
          transition-all
          duration-300

          hover:bg-white/15
          hover:ring-white/30
        "
                    >
                      {/* VALUE */}
                      <div className="text-white font-semibold text-[22px] leading-none">
                        {value}
                      </div>

                      {/* LABEL */}
                      <div className="mt-1 text-[14px] text-white">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>


              </div>


            </motion.div>

          </div>
        </section>


        <section className="mx-auto max-w-7xl px-4 py-14 md:py-20" id="results" ref={roomsSec.ref}>
          <motion.div
            initial="hidden"
            animate={roomsSec.inView ? "show" : "hidden"}
            variants={fadeUp}
            className="flex items-end justify-between gap-4"
          >
            <div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-[#a11d2e]">
                ACCOMMODATIONS
              </div>
              <h2 className="mt-2 text-2xl md:text-4xl leading-tight font-semibold">
                Available Rooms
              </h2>
            </div>

            <div className="text-sm text-[#7b6a61]">
              {hasValidRange && hasGuests
                ? `${filteredRooms.length} of ${rooms.length} shown`
                : `${rooms.length} rooms available`}
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={roomsSec.inView ? "show" : "hidden"}
            variants={fadeUp}
            className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredRooms.map((r) => (
              <RoomCard key={r._id}
                room={r}
                range={range}
                guests={totalGuests}
                onClick={() =>
                  navigate(`/rooms/${r._id}`, {
                    state: JSON.parse(sessionStorage.getItem("searchParams")),
                  })
                }
              />
            ))}
          </motion.div>
        </section>


        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="h-full w-full bg-[#fffaf7]" />

            {/* top-right soft circle */}
            <div className="absolute right-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-[#f4ece7]" />

            {/* left mid soft circle */}
            <div className="absolute left-[-120px] top-[220px] h-[320px] w-[320px] rounded-full bg-[#f6efea]" />
          </div>

          <div className="mx-auto max-w-7xl px-4 py-4 md:py-14">
            {/* ================= HEADER ================= */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              className="mx-auto max-w-3xl text-center "
            >
              <div className="text-[11px] tracking-[0.22em] uppercase text-[#a11d2e]">
                WHY CHOOSE US
              </div>

              <h2 className="mt-3 text-3xl md:text-4xl leading-tight font-semibold">
                Experience the{" "}
                <span className="text-[#a11d2e]">Gulposh</span> Difference
              </h2>

              <p className="mt-4 text-sm md:text-base text-[#7b6a61]">
                We believe in creating memorable experiences through exceptional
                service, authentic connections, and attention to every detail.
              </p>
            </motion.div>

            {/* ================= CARDS GRID ================= */}
            <div
              className="
     mt-6 sm:mt-14
    grid grid-cols-2
    gap-2 sm:gap-5
    sm:grid-cols-2
    lg:grid-cols-4
  "
              id="amenities"
            >
              {[
                {
                  icon: HeartHandshake,
                  title: "Direct Owner Connect",
                  desc: "Communicate directly with the villa owner for personalized service and local insights.",
                },
                {
                  icon: ShieldCheck,
                  title: "Hassle-Free Booking",
                  desc: "Simple, transparent booking process with no hidden fees or complicated procedures.",
                },
                {
                  icon: Sparkles,
                  title: "Instant Confirmation",
                  desc: "Get immediate booking confirmation and access to all property details.",
                },
                {
                  icon: MapPinned,
                  title: "Prime Location",
                  desc: "Nestled in nature yet accessible, perfect blend of tranquility and convenience.",
                },
                {
                  icon: UserRound,
                  title: "Personalized Experience",
                  desc: "Tailored stays with attention to your preferences and special requests.",
                },
                {
                  icon: Wifi,
                  title: "Modern Amenities",
                  desc: "High-speed Wi-Fi, smart comforts, and premium entertainment systems.",
                },
                {
                  icon: ParkingCircle,
                  title: "Free Parking",
                  desc: "Complimentary secure parking for a smooth and stress-free stay.",
                },
                {
                  icon: CookingPot,
                  title: "Gourmet Kitchen",
                  desc: "Fully equipped kitchen with premium appliances for home-style meals.",
                },
              ].map((c, i) => (
                <motion.div
                  key={c.title}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="
        rounded-2xl
        bg-white
        border border-[#efe3dc]
        p-2 sm:p-5
        shadow-[0_6px_24px_-12px_rgba(0,0,0,0.15)]
        transition-all
        hover:shadow-[0_14px_40px_-16px_rgba(0,0,0,0.25)]
      "
                >
                  {/* 🔁 RESPONSIVE CONTENT LAYOUT */}
                  <div
                    className="
          flex flex-col
          items-center text-center
          gap-3
          sm:flex-row sm:items-start sm:text-left sm:gap-4
        "
                  >
                    {/* ICON */}
                    <div
                      className="
            h-11 w-11
            rounded-2xl
            bg-[#a11d2e]/10
            text-[#a11d2e]
            grid place-items-center
            shrink-0
          "
                    >
                      <c.icon className="h-5 w-5" />
                    </div>

                    {/* TEXT */}
                    <div>
                      <div className="text-[13px] font-medium sm:text-[16px] sm:font-medium leading-tight">
                        {c.title}
                      </div>
                      <p className="mt-2 text-[12px] sm:text-sm text-[#7b6a61] leading-snug">
                        {c.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        {/* ======================================================
          BOOK ENTIRE VILLA (exact dark CTA block)
      ====================================================== */}
        <section className="bg-[#fffaf7] text-white" ref={cta.ref}>
          <div className="mx-auto max-w-7xl px-4 py-8  md:py-14">
            <motion.div
              initial="hidden"
              animate={cta.inView ? "show" : "hidden"}
              variants={fadeUp}
              className="relative overflow-hidden rounded-3xl bg-[#2a201b]"
            >
              {/* Background image overlay style */}
              <img
                src="/EntireVilla.webp"
                alt="Book the Entire Villa"
                className="absolute inset-0 h-full w-full object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/55" />

              <div className="relative p-6 md:p-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr] items-center">
                <div>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] tracking-widest uppercase text-white/90 ring-1 ring-white/15 backdrop-blur">
                    Exclusive Experience
                  </div>

                  <h4 className="mt-5">For Groups of <span className="font-bold text-[18px]">10+ Guests</span></h4>
                  <h3 className="mt-2 text-3xl md:text-4xl leading-tight font-semibold">
                    Book the Entire Villa
                  </h3>

                  <p className="mt-4 text-sm md:text-base text-white/80 max-w-xl font-sans">
                    For the ultimate private retreat, reserve all three rooms and enjoy
                    exclusive access to every corner of Gulposh Villa.
                  </p>

                  <ul className="mt-6 grid gap-2 text-sm text-white/80 font-sans">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      All 3 rooms included
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      Private access for your group
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      24/7 concierge service
                    </li>
                  </ul>

                  <div className="mt-7 mb-4 flex flex-wrap gap-3">
                    <Button
                      className="rounded-[8px] px-4 py-4 bg-white text-black hover:bg-white"
                      onClick={() => navigate("/entire-villa-form")}
                    >
                      Enquire Now <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-[8px] px-4 py-4 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                      onClick={() =>
                        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      View Rooms
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

      </div>


      {showVillaPopup && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">

          {/* BACKDROP */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowVillaPopup(false)}
          />

          {/* MODAL */}
          <div className="relative z-10 w-full max-w-xl rounded-3xl overflow-hidden bg-white shadow-2xl animate-in fade-in zoom-in-95">

            {/* IMAGE */}
            <div className="relative h-60">
              <img
                src="/EntireVilla.webp"
                alt="Entire Villa"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* CLOSE BUTTON */}
              <button
                onClick={() => setShowVillaPopup(false)}
                className="absolute top-3 right-3 h-10 w-9 rounded-full bg-white/90 hover:bg-white text-black text-[20px] pb-1 font-semibold"
              >
                ×
              </button>

              <div className="absolute bottom-4 left-4 text-white">
                <div className="text-xs uppercase tracking-widest opacity-80">
                  Perfect For Large Groups
                </div>
                <h3 className="text-2xl font-semibold">
                  Book the Entire Villa
                </h3>
              </div>
            </div>

            {/* CONTENT */}
            <div className="p-6 text-left">
              <p className="text-sm text-gray-600">
                You selected a large group. For 10+ guests, we recommend reserving
                the entire Gulposh Villa for complete privacy and a better
                experience.
              </p>

              <div className="mt-5 space-y-2 text-sm text-gray-700">
                <div>✔ Private access to all 3 rooms</div>
                <div>✔ Full property exclusively for your group</div>
                <div>✔ Dedicated support & custom arrangements</div>
              </div>

              <div className="mt-6 flex gap-3 justify-start">
                <Button
                  className="bg-[#a11d2e] hover:bg-[#8e1827] text-white rounded-[8px] px-4 py-4"
                  onClick={() => {
                    sessionStorage.setItem(
                      "searchParams",
                      JSON.stringify({ range, adults, children })
                    );
                    navigate("/entire-villa-form");
                  }}
                >
                  Enquire Now
                </Button>

                <Button
                  variant="outline"
                  className="rounded-[8px] px-4 py-4"
                  onClick={() => setShowVillaPopup(false)}
                >
                  Continue Room Booking
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
