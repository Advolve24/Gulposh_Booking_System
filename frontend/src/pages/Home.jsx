import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/http";
import RoomCard from "../components/RoomCard";
import CalendarRange from "../components/CalendarRange";
import GuestCounter from "@/components/GuestCounter";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

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

function mergeRanges(ranges) {
  if (!ranges || !ranges.length) return [];

  const sorted = ranges
    .map((r) => ({ from: new Date(r.from), to: new Date(r.to) }))
    .sort((a, b) => a.from - b.from);

  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];

    const dayAfterLast = new Date(
      last.to.getFullYear(),
      last.to.getMonth(),
      last.to.getDate() + 1
    );

    if (cur.from <= dayAfterLast) {
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

/* ================= PAGE ================= */

export default function Home() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [disabledAll, setDisabledAll] = useState([]);
  const [range, setRange] = useState();
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);

  const totalGuests = adults + children;
  const hasValidRange = !!(range?.from && range?.to);
  const hasGuests = totalGuests > 0;

  const heroRef = useRef(null);

  const why = useOnceInView();
  const process = useOnceInView();
  const roomsSec = useOnceInView();
  const cta = useOnceInView();
  const footer = useOnceInView("-40px");

  /* ================= LOAD DATA ================= */

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
          to: toDateOnlyFromAPIUTC(b.to || b.endDate),
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

  /* ================= FILTER LOGIC ================= */

  const filteredRooms = useMemo(() => {
    if (!hasValidRange || !hasGuests) return rooms;

    const s = toDateOnly(range.from);
    const e = toDateOnly(range.to);
    const g = Number(totalGuests);

    return rooms.filter((r) => {
      const cap = Number(r.maxGuests || 1);
      if (g > cap) return false;

      const conflict = disabledAll.some((b) => !(e < b.from || s > b.to));
      return !conflict;
    });
  }, [rooms, disabledAll, range, totalGuests, hasValidRange, hasGuests]);

  useEffect(() => {
    if (totalGuests > 10) {
      navigate("/entire-villa-form");
    }
  }, [totalGuests, navigate]);

  const onSearch = () => {
    if (!hasValidRange || !hasGuests) {
      alert("Please select dates and guests");
      return;
    }

    // ✅ 1. SAVE SEARCH DATA (THIS WAS MISSING)
    sessionStorage.setItem(
      "searchParams",
      JSON.stringify({
        range,
        adults,
        children,
      })
    );

    // ✅ 2. SHOW / SCROLL TO ROOMS SECTION
    document.getElementById("results")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };



  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-[#fffaf7] text-[#2A201B]">
      {/* ======================================================
          HERO 
      ====================================================== */}
      <section
  ref={heroRef}
  className="
    relative isolate overflow-hidden
    w-full
    items-center pt-10 pb-10 sm:pt-24 sm:pb-24"
    >


        {/* ================= BACKGROUND ================= */}
        <div className="absolute inset-0 -z-10 " >
          <motion.img
            src="/EntireVilla.webp"
            alt="Gulposh Villa"
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 1.9,
              ease: [0.16, 1, 0.3, 1], // luxury smooth easing
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* dark overlay */}
          <div className="absolute inset-0 bg-black/50" />
          {/* warm fade to page */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-[#8a807948]" />
        </div>

        {/* ================= CONTENT ================= */}
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
                <Star className="h-3.5 w-3.5 text-[#E3B26A]" />
                <span>4.9</span>
              </span>
            </div>
          </motion.div>

          {/* ================= TITLE ================= */}
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
              <span className="block text-[#E3B26A] mt-2">
                Amidst Nature
              </span>
            </h1>

            <p className="mt-4 max-w-xl mx-auto text-[13px] sm:text-[16px]  text-white/90 font-sans ">
              Discover an exclusive retreat where elegance meets tranquility.<br />
              Book your stay at Gulposh Villa today.
            </p>
          </motion.div>


          {/* ================= SEARCH CARD ================= */}
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
        gap-4
        md:grid-cols-[1.3fr_1fr_auto]
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
                      onChange={setRange}
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
                rounded-2xl
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

                    <PopoverContent className="w-72 p-4 rounded-2xl">
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
                    </PopoverContent>
                  </Popover>
                </div>

                {/* CTA */}
                <Button
                  onClick={onSearch}
                  className="
          h-14
          w-full md:w-auto
          rounded-2xl
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

      {/* ======================================================
          ROOMS (backend cards)
      ====================================================== */}
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
            {filteredRooms.length} of {rooms.length} shown
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={roomsSec.inView ? "show" : "hidden"}
          variants={fadeUp}
          className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredRooms.map((r) => (
            // <RoomCard key={r._id} room={r} range={range} guests={totalGuests} />
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

      {/* ======================================================
          WHY CHOOSE US (exact 8 cards + icons)
      ====================================================== */}
      <section className="relative overflow-hidden">
        {/* ================= BACKGROUND SHAPES ================= */}
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

                <h3 className="mt-5 text-3xl md:text-4xl leading-tight font-semibold">
                  Book the Entire Villa
                </h3>

                <p className="mt-4 text-sm md:text-base text-white/80 max-w-xl font-sans">
                  For the ultimate private retreat, reserve all three rooms and enjoy
                  exclusive access to every corner of Gulposh Villa.
                </p>

                <ul className="mt-6 grid gap-2 text-sm text-white/80 font-sans">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E3B26A]" />
                    All 3 rooms included
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E3B26A]" />
                    Private access for your group
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E3B26A]" />
                    24/7 concierge service
                  </li>
                </ul>

                <div className="mt-7 mb-4 flex flex-wrap gap-3">
                  <Button
                    className="rounded-full bg-[#E3B26A] text-black hover:bg-[#d4a255]"
                    onClick={() => navigate("/entire-villa-form")}
                  >
                    Enquire Now <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    className="rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20"
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
      <footer className="bg-[#A11D2E] text-white">
        <div
          className="
      max-w-7xl mx-auto
      px-4 py-4
      shadow-[0_-6px_20px_-10px_rgba(0,0,0,0.35)]
    "
        >
          <div
            className="
        flex flex-col
        gap-3
        text-xs font-medium
        md:flex-row md:items-center md:justify-between
      "
          >
            {/* LEFT */}
            <div className="text-white/90">
              © {new Date().getFullYear()} Gulposh Villa. All rights reserved.
            </div>

            {/* RIGHT */}
            <div className="flex gap-6">
              <button
                className="
            text-white/80
            hover:text-white
            transition-colors
          "
              >
                Privacy Policy
              </button>

              <button
                className="
            text-white/80
            hover:text-white
            transition-colors
          "
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
