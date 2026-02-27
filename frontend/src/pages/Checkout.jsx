
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Users, Utensils, Check, User, ConciergeBell, Mail, Phone, Home, CalendarIcon } from "lucide-react";
import { toDateOnly, toDateOnlyFromAPI, toDateOnlyFromAPIUTC } from "../lib/date";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import CalendarRange from "../components/CalendarRange";
import { loadRazorpayScript } from "../lib/loadRazorpay";
import { getAllCountries, getStatesByCountry, getCitiesByState } from "../lib/location";
import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRecaptchaVerifier } from "@/lib/recaptcha";


function minusOneDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}


export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, init, phoneLogin } = useAuth();

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

  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const totalGuests = adults + children;
  const [withMealState, setWithMealState] = useState(false);
  const withMeal =
    room?.mealMode === "only" || room?.mealMode === "price"
      ? withMealState
      : false;

  const [vegGuests, setVegGuests] = useState(0);
  const [nonVegGuests, setNonVegGuests] = useState(0);

  const [range, setRange] = useState({
    from: state?.startDate ? new Date(state.startDate) : null,
    to: state?.endDate ? new Date(state.endDate) : null,
  });

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const hasRoomCoupon =
    room &&
    room.discountType &&
    room.discountType !== "none" &&
    room.discountCode &&
    room.discountCode.trim() !== "";

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

      if (cur.from <= last.to) {
        if (cur.to > last.to) last.to = cur.to;
      } else {
        out.push(cur);
      }
    }

    return out;
  }

  const [taxPercent, setTaxPercent] = useState(0);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [otpStep, setOtpStep] = useState("idle");
  const [otp, setOtp] = useState("");
  const pendingProceedRef = useRef(false);

  const countries = getAllCountries();
  const statesList = address.country
    ? getStatesByCountry(address.country)
    : [];
  const citiesList =
    address.country && address.state
      ? getCitiesByState(address.country, address.state)
      : [];

  useEffect(() => {
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
  }, []);


  useEffect(() => {
    if (state === undefined) return;
    if (!state?.roomId) {
      navigate("/", { replace: true });
      return;
    }
    api.get(`/rooms/${state.roomId}`).then(({ data }) => setRoom(data));
  }, [state, navigate]);


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
      country: user.country || "",
      state: user.state || "",
      city: user.city || "",
      pincode: user.pincode || "",
    });

    setOtpStep("verified");
  }, [user]);


  useEffect(() => {
    if (!withMeal) return;

    const totalMeal = vegGuests + nonVegGuests;

    if (totalMeal === 0 && totalGuests > 0) {
      setVegGuests(1);
      setNonVegGuests(0);
    }

    if (totalMeal > totalGuests) {
      setNonVegGuests(Math.max(0, totalGuests - vegGuests));
    }
  }, [totalGuests, withMeal]);

  useEffect(() => {
    api.get("/tax")
      .then(({ data }) => {
        setTaxPercent(data.taxPercent);
      })
      .catch(() => {
        toast.error("Failed to load tax configuration");
      });
  }, []);


  const nights = useMemo(() => {
    if (!range.from || !range.to) return 0;

    const diff =
      (toDateOnly(range.to) - toDateOnly(range.from)) /
      (1000 * 60 * 60 * 24);

    return Math.max(0, Math.round(diff));
  }, [range]);

  const roomTotal = useMemo(() => {
    return nights * (room?.pricePerNight || 0);
  }, [nights, room]);

  const mealTotal = useMemo(() => {
    if (!room) return 0;
    if (room.mealMode === "only") return 0;
    if (room.mealMode === "price" && withMeal) {
      return (
        nights *
        (vegGuests * room.mealPriceVeg +
          nonVegGuests * room.mealPriceNonVeg)
      );
    }
    return 0;
  }, [room, nights, withMeal, vegGuests, nonVegGuests]);

  const subTotal = useMemo(() => {
    return roomTotal + mealTotal;
  }, [roomTotal, mealTotal]);

  const discountAmount = useMemo(() => {
    if (!hasRoomCoupon) return 0;
    if (!couponApplied) return 0;
    if (couponCode !== room.discountCode) return 0;

    if (room.discountType === "percent") {
      return Math.round((subTotal * room.discountValue) / 100);
    }

    if (room.discountType === "flat") {
      return room.discountValue || 0;
    }

    return 0;
  }, [hasRoomCoupon, couponApplied, couponCode, room, subTotal]);

  const discountedSubtotal = useMemo(() => {
    return Math.max(0, subTotal - discountAmount);
  }, [subTotal, discountAmount]);

  const cgstPercent = taxPercent / 2;
  const sgstPercent = taxPercent / 2;

  const cgstAmount = useMemo(() => {
    return Math.round(
      (discountedSubtotal * cgstPercent) / 100
    );
  }, [discountedSubtotal, cgstPercent]);

  const sgstAmount = useMemo(() => {
    return Math.round(
      (discountedSubtotal * sgstPercent) / 100
    );
  }, [discountedSubtotal, sgstPercent]);

  const totalTax = cgstAmount + sgstAmount;

  const grandTotal = useMemo(() => {
    return discountedSubtotal + totalTax;
  }, [discountedSubtotal, totalTax]);

  const proceedPayment = async () => {
    if (processingPayment) return;
    setProcessingPayment(true);
    const g = totalGuests;

    if (room.mealMode === "price" && withMeal) {
      const mealGuests = vegGuests + nonVegGuests;

      if (mealGuests < 1) {
        toast.error("Please select at least 1 guest for meals");
        setProcessingPayment(false);
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

    const { data: availability } = await api.post("/bookings/check-availability", {
      roomId,
      startDate: toYMD(range.from),
      endDate: toYMD(range.to),
    });

    if (!availability.available) {
      toast.error("Sorry, these dates were just booked by another guest.");
      setProcessingPayment(false);
      return;
    }

    const ok = await loadRazorpayScript();
    if (!ok) {
      toast.error("Failed to load payment gateway");
      setProcessingPayment(false);
      return;
    }
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
      couponCode,
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
            nights,
            pricePerNight: room.pricePerNight,
            roomTotal,
            mealTotal,
            amount: grandTotal,
            taxBreakup: {
              cgstPercent,
              sgstPercent,
              cgstAmount,
              sgstAmount,
              totalTax,
            },
            discountMeta: discountAmount > 0 ? {
              discountType: room.discountType,
              discountValue: room.discountValue,
              discountAmount,
            } : null,
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
    setProcessingPayment(false);
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
          className="text-l hover:opacity-100 bg-black/10 p-2 rounded w-fit flex gap-1 ml-4"
        >
          <ArrowLeft className="text-black/60" />Back
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
                <div className="flex flex-wrap flex-col items-start gap-x-2 gap-y-2">
                  <span className="font-semibold text-foreground text-[22px]">
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
                    <span>
                      {room.mealMode === "only"
                        ? "Meals Included"
                        : withMeal
                          ? "With Meals"
                          : "Without Meals"}
                    </span>
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

                  {room.mealMode === "price" && withMeal && (
                    <div className="flex justify-between">
                      <span>Meals</span>
                      <span>₹{mealTotal.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Discount</span>
                      <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  {room.mealMode === "only" && (
                    <div className="flex justify-between text-green-700">
                      <span>Meals</span>
                      <span>Included</span>
                    </div>
                  )}

                  <div className="flex flex-col justify-between text-muted-foreground">
                    <div className="flex justify-between">
                      <span>CGST ({cgstPercent}%)</span>
                      <span>₹{cgstAmount.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>SGST ({sgstPercent}%)</span>
                      <span>₹{sgstAmount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* TOTAL */}
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[18px] font-medium">Total</div>
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
                roomId={roomId}
                value={range}
                onChange={setRange}
                disabledRanges={disabledAll}
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

            {/* ================= MEALS TOGGLE ================= */}
            <div className="space-y-3">
              {(room.mealMode === "only" || room.mealMode === "price") && (
                <Label className="flex items-center gap-2">
                  <Checkbox
                    checked={withMealState}
                    onCheckedChange={(v) => {
                      setWithMealState(Boolean(v));
                      setVegGuests(0);
                      setNonVegGuests(0);
                    }}
                  />
                  <span className="flex items-center gap-1">
                    <Utensils className="w-4 h-4" />
                    Include Meals
                  </span>
                </Label>
              )}


              {room.mealMode === "only" && (
                <div className="rounded-xl border bg-green-50 p-4 text-sm text-green-700">
                  Meals are included in room price. You can opt out if not required.
                </div>
              )}

              {room.mealMode === "price" && withMeal && (
                <div className="rounded-xl border bg-[#faf7f4] p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Meal prices are per guest per night
                  </p>

                  <div className="flex justify-between text-sm">
                    <span>Veg Meal</span>
                    <span>₹{room.mealPriceVeg} / guest / night</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Non-Veg Meal</span>
                    <span>₹{room.mealPriceNonVeg} / guest / night</span>
                  </div>
                </div>
              )}

            </div>
            {/* ================= MEALS ================= */}
            {withMeal && (
              <div className="space-y-4 pt-2">

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
                  Meal Guests Selected:{" "}
                  <strong>{vegGuests + nonVegGuests}</strong> / {totalGuests}
                </p>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount</span>
                <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
              </div>
            )}
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
                  <span>₹{roomTotal.toLocaleString("en-IN")}</span>
                </span>
              </div>

              {withMeal && (
                <div className="flex justify-between">
                  <span>Meals</span>
                  <span>
                    <span>₹{mealTotal.toLocaleString("en-IN")}</span>
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span>GST</span>
                <span>
                  <span>₹{totalTax.toLocaleString("en-IN")}</span>
                </span>
              </div>

              <Separator />

              {hasRoomCoupon && (
                <div className="space-y-2">
                  <Label>Promo Code</Label>

                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) =>
                        setCouponCode(e.target.value.toUpperCase())
                      }
                      placeholder="Enter promo code"
                    />

                    <Button
                      type="button"
                      onClick={() => {
                        if (couponCode === room.discountCode) {
                          setCouponApplied(true);
                          toast.success(`${room.discountLabel || "Offer"} applied!`);
                        } else {
                          setCouponApplied(false);
                          toast.error("Invalid code for this room");
                        }
                      }}
                    >
                      Apply
                    </Button>
                  </div>

                  {room.discountLabel && (
                    <p className="text-xs text-muted-foreground">
                      Available Offer: <strong>{room.discountLabel}</strong>
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between font-semibold">
                <span className="text-[16px]">Total Payable</span>
                <span className="text-red-700 text-[18px]">
                  ₹{grandTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Includes all applicable taxes & fees
            </p>
          </div>

          {/* ================= CTA ================= */}
          <Button
            disabled={processingPayment}
            className="w-full h-12 text-base bg-red-700 hover:bg-red-800 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            onClick={proceed}
          >
            {processingPayment ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4A10 10 0 002 12h2z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              "Proceed to Payment"
            )}
          </Button>

          {/* ================= MOBILE FIXED CTA ================= */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t px-4 py-3">
            <Button
              disabled={processingPayment}
              className="w-full h-12 text-base bg-red-700 hover:bg-red-800 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={proceed}
            >
              {processingPayment ? "Processing..." : "Proceed to Payment"}
            </Button>
          </div>


        </section>

      </div>
    </div>
  );
}