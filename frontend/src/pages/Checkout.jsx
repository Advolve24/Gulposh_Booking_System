
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../store/authStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Users,
  Utensils,
  Check,
  User,
  ConciergeBell,
  Mail,
  Phone,
  Home,
  CalendarIcon,
} from "lucide-react";

import {
  toDateOnly,
  toDateOnlyFromAPI,
  toDateOnlyFromAPIUTC,
} from "../lib/date";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { format } from "date-fns";
import { toast } from "sonner";

import CalendarRange from "../components/CalendarRange";
import { loadRazorpayScript } from "../lib/loadRazorpay";

import {
  getAllCountries,
  getStatesByCountry,
  getCitiesByState,
} from "../lib/location";

import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRecaptchaVerifier } from "@/lib/recaptcha";


export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, init, phoneLogin } = useAuth();

  /* ================= ROOM ================= */
  const roomId = state?.roomId;

  const initialAdults = Number(state?.adults ?? 1);
  const initialChildren = Number(state?.children ?? 0);

  const [room, setRoom] = useState(null);

  /* ================= FORM ================= */
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: null,
  });

  const [address, setAddress] = useState({
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  const [bookedAll, setBookedAll] = useState([]);
  const [blackoutRanges, setBlackoutRanges] = useState([]);
  const toYMD = (d) => (d ? format(new Date(d), "yyyy-MM-dd") : null);

  /* ================= GUESTS & MEALS ================= */
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const totalGuests = adults + children;
  const initialWithMeal = Boolean(state?.withMeal);
  const [withMeal, setWithMeal] = useState(initialWithMeal);
  const [vegGuests, setVegGuests] = useState(0);
  const [nonVegGuests, setNonVegGuests] = useState(0);

  /* ================= DATE RANGE ================= */
  const [range, setRange] = useState({
    from: state?.startDate ? new Date(state.startDate) : null,
    to: state?.endDate ? new Date(state.endDate) : null,
  });

  const disabledAll = useMemo(
    () => mergeRanges([...blackoutRanges, ...bookedAll]),
    [blackoutRanges, bookedAll]
  );

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

  const [pricing, setPricing] = useState(null);



  /* ================= OTP ================= */
  const [otpStep, setOtpStep] = useState("idle");
  const [otp, setOtp] = useState("");
  const pendingProceedRef = useRef(false);

  /* ================= LOCATION DATA ================= */
  const countries = getAllCountries();
  const statesList = address.country
    ? getStatesByCountry(address.country)
    : [];
  const citiesList =
    address.country && address.state
      ? getCitiesByState(address.country, address.state)
      : [];

  useEffect(() => {
    // global bookings + blocked
    api.get("/rooms/disabled/all").then(({ data }) =>
      setBookedAll(
        (data || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from || b.startDate),
          to: toDateOnlyFromAPIUTC(b.to || b.endDate),
        }))
      )
    );

    // global blackouts
    api.get("/blackouts").then(({ data }) =>
      setBlackoutRanges(
        (data || []).map((b) => ({
          from: toDateOnlyFromAPI(b.from),
          to: toDateOnlyFromAPI(b.to),
        }))
      )
    );
  }, []);


  /* ================= LOAD ROOM ================= */
  useEffect(() => {
    if (!roomId) return navigate("/", { replace: true });
    api.get(`/rooms/${roomId}`).then(({ data }) => setRoom(data));
  }, [roomId, navigate]);

  /* ================= AUTOFILL PROFILE (READ-ONLY) ================= */
  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      dob: user.dob ? new Date(user.dob) : null,
    });

    setAddress({
      address: user.address || "",
      country: user.country || "",   // ✅ name
      state: user.state || "",       // ✅ name
      city: user.city || "",
      pincode: user.pincode || "",
    });

    setOtpStep("verified");
  }, [user]);


  useEffect(() => {
    if (!withMeal) return;

    const totalMeal = vegGuests + nonVegGuests;

    // ensure minimum 1 meal guest
    if (totalMeal === 0 && totalGuests > 0) {
      setVegGuests(1);
      setNonVegGuests(0);
    }

    // clamp if guests reduced
    if (totalMeal > totalGuests) {
      setNonVegGuests(Math.max(0, totalGuests - vegGuests));
    }
  }, [totalGuests, withMeal]);

  /* ================= CALCULATIONS (PREVIEW ONLY) ================= */

  const nights = useMemo(() => {
    if (!range.from || !range.to) return 0;
    return (
      (toDateOnly(range.to) - toDateOnly(range.from)) /
      (1000 * 60 * 60 * 24)
    );
  }, [range]);

  const roomTotal = useMemo(() => {
    return nights * (room?.pricePerNight || 0);
  }, [nights, room]);

  const mealTotal = useMemo(() => {
    if (!withMeal || !room) return 0;
    return (
      nights *
      (vegGuests * room.mealPriceVeg +
        nonVegGuests * room.mealPriceNonVeg)
    );
  }, [withMeal, room, nights, vegGuests, nonVegGuests]);

  /* ⚠️ Preview subtotal only (NOT FINAL) */
  const previewSubTotal = useMemo(() => {
    return roomTotal + mealTotal;
  }, [roomTotal, mealTotal]);

  const proceedPayment = async () => {
    const g = totalGuests;

    if (withMeal) {
      const mealGuests = vegGuests + nonVegGuests;

      if (mealGuests < 1) {
        toast.error("Please select at least 1 guest for meals");
        return;
      }

      if (mealGuests > g) {
        toast.error("Meal guests cannot exceed total guests");
        return;
      }
    }

    if (!form.email || !form.email.trim()) {
      toast.error("Email is required for booking confirmation");
      return;
    }

    const ok = await loadRazorpayScript();
    if (!ok) {
      toast.error("Failed to load payment gateway");
      return;
    }

    // ✅ Backend calculates EVERYTHING (tax, totals, amount)
    const { data } = await api.post("/payments/create-order", {
      roomId,
      startDate: toYMD(range.from),
      endDate: toYMD(range.to),
      guests: g,
      adults,
      children,
      withMeal,
      vegGuests,
      nonVegGuests,
      contactName: form.name,
      contactEmail: form.email,
      contactPhone: form.phone,
    });

    // ✅ Save backend-calculated pricing
    setPricing({
      nights: data.nights,
      roomTotal: data.roomTotal,
      mealTotal: data.mealTotal,
      stayTax: data.stayTax,
      foodTax: data.foodTax,
      totalTax: data.totalTax,
      subTotal: data.subTotal,
      grandTotal: data.grandTotal,
    });

    const rzp = new window.Razorpay({
      key: data.key,
      amount: data.amount,
      currency: "INR",
      name: room.name,
      description: `${room.name} booking`,
      order_id: data.orderId,

      prefill: {
        name: form.name || "",
        email: form.email || "",
        contact: String(form.phone || ""),
      },

      notes: {
        roomId,
        guests: String(g),
      },

      handler: async (resp) => {
        let toastId;

        try {
          // 🔄 show loading toast and keep its id
          toastId = toast.loading("Confirming your booking...");

          const countryObj = countries.find(
            (c) => c.isoCode === address.country
          );

          const stateObj = statesList.find(
            (s) => s.isoCode === address.state
          );

          const { data } = await api.post("/payments/verify", {
            ...resp,
            roomId,
            startDate: toYMD(range.from),
            endDate: toYMD(range.to),
            guests: g,
            adults,
            children,
            withMeal,
            vegGuests,
            nonVegGuests,
            contactName: form.name,
            contactEmail: form.email,
            contactPhone: form.phone,

            address: address.address || null,
            country: countryObj?.name || null,
            state: stateObj?.name || null,
            city: address.city || null,
            pincode: address.pincode || null,
          });

          toast.success("Booking confirmed 🎉", { id: toastId });

          sessionStorage.removeItem("searchParams");
          navigate(`/booking-success/${data.booking._id}`, {
            replace: true,
          });
        } catch (err) {
          console.error("Payment verified but booking failed:", err);

          // ❌ replace loading toast with error
          toast.error(
            "Payment successful, but booking confirmation failed. Please contact support.",
            { id: toastId }
          );
        }
      },


      modal: {
        ondismiss: () => {
          toast.info("Payment cancelled");
        },
      },

      theme: {
        color: "#BA081C",
      },
    });

    rzp.open();
  };


  const proceed = async () => {
    if (!user) {
      pendingProceedRef.current = true;
      if (otpStep === "idle") sendOtp();
      return toast.info("Verify mobile number to continue");
    }
    proceedPayment();
  };

  if (!room) return null;

  const roomImage =
    room?.images?.length > 0
      ? room.images[0]
      : room?.image || room?.coverImage || null;


  function ReadOnlyField({ label, value, icon: Icon }) {
    if (!value) return null;

    return (
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <div className="flex items-start gap-2">
          {Icon && (
            <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          )}
          <p className="text-sm font-medium text-foreground break-words">
            {value}
          </p>
        </div>
      </div>
    );
  }


  function Counter({
    label,
    value,
    min = 0,
    max = Infinity,
    onChange,
    helper,
  }) {
    const decrement = () => onChange(Math.max(min, value - 1));
    const increment = () => onChange(Math.min(max, value + 1));

    return (
      <div className="space-y-1">
        <Label>{label}</Label>

        <div className="flex items-center justify-between rounded-xl border px-3 py-2">
          <button
            type="button"
            onClick={decrement}
            disabled={value <= min}
            className="h-8 w-8 rounded-full border text-lg disabled:opacity-40"
          >
            −
          </button>

          <span className="text-sm font-semibold w-6 text-center">
            {value}
          </span>

          <button
            type="button"
            onClick={increment}
            disabled={value >= max}
            className="h-8 w-8 rounded-full border text-lg disabled:opacity-40"
          >
            +
          </button>
        </div>

        {helper && (
          <p className="text-xs text-muted-foreground">{helper}</p>
        )}
      </div>
    );
  }


  function MobileRoomCard({ room, image }) {
    if (!room) return null;

    return (
      <div className="lg:hidden">
        <div className="flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm">
          {/* IMAGE */}
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
            {image && (
              <img
                src={image}
                alt={room.name}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {/* CONTENT */}
          <div className="flex-1">
            <p className="text-sm font-semibold leading-tight">
              {room.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ref: {room._id?.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* reCAPTCHA – hidden, no layout impact */}
      <div
        id="recaptcha-container"
        className="absolute inset-0 opacity-0 pointer-events-none"
      />
      {/* ================= CHECKOUT STEPS ================= */}
      <div className="w-full flex justify-center mb-5">
        <div
          className="
      flex items-center
      gap-1 sm:gap-4
      overflow-x-auto sm:overflow-visible
      px-2
    "
        >

          {/* STEP 1 — COMPLETED */}
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 min-w-[90px] sm:min-w-0">
            <div className="h-8 w-8 rounded-full bg-red-700 text-white flex items-center justify-center text-sm font-semibold mt-1">
              ✓
            </div>
            <span className="text-xs sm:text-sm font-medium text-foreground text-center">
              Select Room
            </span>
          </div>

          {/* CONNECTOR */}
          <div className=" flex w-10 h-[1px] sm:block sm:w-20 sm:h-[2px] bg-red-700" />

          {/* STEP 2 — ACTIVE */}
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 min-w-[90px] sm:min-w-0">
            <div className="h-8 w-8 rounded-full bg-red-700 text-white ring-4 ring-red-100 flex items-center justify-center text-sm font-semibold mt-1">
              2
            </div>
            <span className="text-xs sm:text-sm font-medium text-foreground text-center">
              Guest Details
            </span>
          </div>

          {/* CONNECTOR */}
          <div className="flex w-10 h-[1px] sm:block sm:w-20 sm:h-[2px] bg-muted" />

          {/* STEP 3 — UPCOMING */}
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 min-w-[90px] sm:min-w-0">
            <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
              3
            </div>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground text-center">
              Payment
            </span>
          </div>

        </div>
      </div>

      {/* BACK BUTTON */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-md text-muted-foreground hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* ================= DESKTOP STICKY SUMMARY ================= */}
        <aside className="hidden lg:block lg:col-span-4">
          <div className="sticky top-[120px] px-4 py-0">

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

              {/* IMAGE */}
              <div className="relative">
                {roomImage && (
                  <img
                    src={roomImage}
                    alt={room.name}
                    className="h-56 w-full object-cover"
                  />
                )}

                {/* BADGE */}
                <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Best Value
                </span>
              </div>

              {/* CONTENT */}
              <div className="p-5 space-y-4 text-sm">

                {/* TITLE */}
                {/* LOCATION */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-foreground">
                    {room?.name}
                  </span>



                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>Karjat, Maharashtra</span>
                  </div>
                </div>

                {/* GUESTS + MEALS */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{totalGuests} Guests</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4" />
                    <span>{withMeal ? "With Meals" : "Without Meals"}</span>
                  </div>
                </div>

                {/* CHECK-IN / CHECK-OUT */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#faf7f4] rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      CHECK-IN
                    </div>
                    <div className="font-medium">
                      {range.from && format(range.from, "dd MMM yyyy")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Saturday, 2:00 PM
                    </div>
                  </div>

                  <div className="bg-[#faf7f4] rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      CHECK-OUT
                    </div>
                    <div className="font-medium">
                      {range.to && format(range.to, "dd MMM yyyy")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Wednesday, 11:00 AM
                    </div>
                  </div>
                </div>

                <Separator />

                {/* PRICE BREAKUP */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>
                      Room ({nights} nights × ₹{room?.pricePerNight})
                    </span>
                    <span>
                      ₹{roomTotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {withMeal && (
                    <div className="flex justify-between">
                      <span>Meals</span>
                      <span>
                        ₹{mealTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxes & Fees</span>
                    <span>Included</span>
                  </div>
                </div>

                <Separator />

                {/* TOTAL */}
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-sm font-medium">Total</div>
                    <div className="text-xs text-muted-foreground">
                      Including all taxes
                    </div>
                  </div>

                  <div className="text-xl font-semibold text-red-600">
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </aside>


        <section className="lg:col-span-6 space-y-6">
          {/* ================= MOBILE ROOM CARD ================= */}
          <div className="lg:hidden">
            <MobileRoomCard room={room} image={roomImage} />
            <Separator className="mt-4" />
          </div>
          {/* ================= PERSONAL INFORMATION ================= */}
          <div className="rounded-2xl border bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <User className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Guest Details</h3>
                <p className="text-xs text-muted-foreground">
                  Information provided for this reservation
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadOnlyField
                label="Full Name"
                value={form.name}
                icon={User}
              />

              <ReadOnlyField
                label="Email Address"
                value={form.email}
                icon={Mail}
              />

              <ReadOnlyField
                label="Date of Birth"
                value={form.dob ? format(form.dob, "dd MMM yyyy") : ""}
                icon={CalendarIcon}
              />

              <ReadOnlyField
                label="Phone Number"
                value={form.phone}
                icon={Phone}
              />
            </div>
          </div>

          {/* ================= ADDRESS DETAILS ================= */}
          <div className="rounded-2xl border bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Address Details</h3>
                <p className="text-xs text-muted-foreground">
                  Billing address for this reservation
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              {/* STREET ADDRESS — FULL ROW (mobile + desktop) */}
              <div className="col-span-2 md:col-span-4">
                <ReadOnlyField
                  label="Street Address"
                  value={address.address}
                  icon={Home}
                />
              </div>

              {/* COUNTRY */}
              <ReadOnlyField
                label="Country"
                value={address.country}
              />

              {/* STATE */}
              <ReadOnlyField
                label="State"
                value={address.state}
              />

              {/* CITY */}
              <ReadOnlyField
                label="City"
                value={address.city}
              />

              {/* PINCODE */}
              <ReadOnlyField
                label="Pincode"
                value={address.pincode}
              />

            </div>

          </div>

          {/* ================= BOOKING PREFERENCES ================= */}
          <div className="rounded-2xl border bg-white p-5 sm:p-6 space-y-6">

            {/* HEADER */}
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <ConciergeBell className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Booking Preferences</h3>
                <p className="text-xs text-muted-foreground">
                  Customize your stay experience
                </p>
              </div>
            </div>

            {/* ================= DATE SELECTION ================= */}
            <div className="space-y-2">
              <Label>Check-in / Check-out</Label>

              <CalendarRange
                value={range}
                onChange={setRange}
                disabledRanges={disabledAll} // ✅ booked + blackout (global)
              />

              {!range?.from && (
                <p className="text-xs text-muted-foreground">
                  Select your stay dates to continue
                </p>
              )}
            </div>

            {/* ================= GUEST COUNT ================= */}
            <div className="grid grid-cols-2 gap-4">

              <Counter
                label="Adults"
                value={adults}
                min={1}
                max={room?.maxGuests - children}
                onChange={(v) => {
                  setAdults(v);
                  setVegGuests(0);
                  setNonVegGuests(0);
                }}
              />

              <Counter
                label="Children"
                value={children}
                min={0}
                max={room?.maxGuests - adults}
                onChange={(v) => {
                  setChildren(v);
                  setVegGuests(0);
                  setNonVegGuests(0);
                }}
              />

              <div className="col-span-2 text-xs text-muted-foreground">
                Total Guests: <strong>{totalGuests}</strong> / {room?.maxGuests}
              </div>
            </div>

            {/* ================= MEALS ================= */}
            <div className="space-y-4 pt-2">
              {withMeal && (
                <div className="space-y-4">

                  <div className="grid grid-cols-2 gap-4">
                    <Counter
                      label="Veg Guests"
                      value={vegGuests}
                      min={0}
                      max={totalGuests}
                      onChange={(v) => {
                        if (v + nonVegGuests > totalGuests) {
                          setVegGuests(totalGuests - nonVegGuests);
                        } else {
                          setVegGuests(v);
                        }
                      }}
                    />

                    <Counter
                      label="Non-Veg Guests"
                      value={nonVegGuests}
                      min={0}
                      max={totalGuests}
                      onChange={(v) => {
                        if (vegGuests + v > totalGuests) {
                          setNonVegGuests(totalGuests - vegGuests);
                        } else {
                          setNonVegGuests(v);
                        }
                      }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Meal Guests Selected: <strong>{vegGuests + nonVegGuests}</strong> / {totalGuests}
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* Payment Summary */}
          <div className="rounded-2xl border bg-white p-5 sm:p-6 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Payment Summary
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Room Charges</span>
                <span>
                  ₹{(pricing?.roomTotal ?? roomTotal).toLocaleString("en-IN")}
                </span>
              </div>

              {withMeal && (
                <div className="flex justify-between">
                  <span>Meals</span>
                  <span>
                    ₹{(pricing?.mealTotal ?? mealTotal).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Total Tax</span>
                <span>
                  ₹{(pricing?.totalTax ?? 0).toLocaleString("en-IN")}
                </span>
              </div>

              <Separator />

              <div className="flex justify-between font-semibold">
                <span>Total Payable</span>
                <span className="text-red-700">
                  ₹{(pricing?.grandTotal ?? previewSubTotal).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Includes all applicable taxes & fees
            </p>
          </div>

          {/* ================= CTA ================= */}
          <Button
            className="w-full h-12 text-base bg-red-700 hover:bg-red-800"
            onClick={proceed}
            disabled={!taxSetting}
          >
            Proceed to Payment
          </Button>

          {/* ================= MOBILE FIXED CTA ================= */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t px-4 py-3">
            <Button
              className="w-full h-12 text-base bg-red-700 hover:bg-red-800"
              onClick={proceed}
            >
              Proceed to Payment
            </Button>
          </div>


        </section>

      </div>
    </div>
  );
}