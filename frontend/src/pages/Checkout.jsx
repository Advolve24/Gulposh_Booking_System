
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../store/authStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { MapPin, Users, Utensils, Check, User, ConciergeBell, } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { CalendarIcon } from "lucide-react";
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

/* ================= HELPERS ================= */
const isValidPhone = (p) => /^[0-9]{10}$/.test(p);
const toYMD = (d) => (d ? format(new Date(d), "yyyy-MM-dd") : null);
const toDateOnly = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, init, phoneLogin } = useAuth();

  /* ================= ROOM ================= */
  const roomId = state?.roomId;
  const initialGuests = Number(state?.guests || 1);

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

  /* ================= GUESTS & MEALS ================= */
  const [guests, setGuests] = useState(String(initialGuests));
  const [withMeal, setWithMeal] = useState(false);
  const [vegGuests, setVegGuests] = useState(0);
  const [nonVegGuests, setNonVegGuests] = useState(0);

  /* ================= DATE RANGE ================= */
  const [range, setRange] = useState({
    from: state?.startDate ? new Date(state.startDate) : null,
    to: state?.endDate ? new Date(state.endDate) : null,
  });

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

  /* ================= LOAD ROOM ================= */
  useEffect(() => {
    if (!roomId) return navigate("/", { replace: true });
    api.get(`/rooms/${roomId}`).then(({ data }) => setRoom(data));
  }, [roomId, navigate]);

  /* ================= AUTOFILL PROFILE ================= */
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
  /* ================= CALCULATIONS ================= */
  const nights = useMemo(() => {
    if (!range.from || !range.to) return 0;
    return (
      (toDateOnly(range.to) - toDateOnly(range.from)) /
      (1000 * 60 * 60 * 24)
    );
  }, [range]);

  const roomTotal = nights * (room?.pricePerNight || 0);

  const mealTotal =
    withMeal && room
      ? nights *
      (vegGuests * room.mealPriceVeg +
        nonVegGuests * room.mealPriceNonVeg)
      : 0;

  const total = roomTotal + mealTotal;

  const proceedPayment = async () => {
    const g = Number(guests);

    if (withMeal && vegGuests + nonVegGuests !== g) {
      toast.error("Veg + Non-Veg guests must equal total guests");
      return;
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

    const { data } = await api.post("/payments/create-order", {
      roomId,
      startDate: toYMD(range.from),
      endDate: toYMD(range.to),
      guests: g,
      withMeal,
      vegGuests,
      nonVegGuests,
      contactName: form.name,
      contactEmail: form.email,
      contactPhone: form.phone,
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

          const { data } = await api.post("/payments/verify", {
            ...resp,
            roomId,
            startDate: toYMD(range.from),
            endDate: toYMD(range.to),
            guests: g,
            withMeal,
            vegGuests,
            nonVegGuests,
            contactName: form.name,
            contactEmail: form.email,
            contactPhone: form.phone,
            ...address,
          });

          // ✅ replace loading toast
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
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Pune, Maharashtra</span>
                </div>

                {/* GUESTS + MEALS */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{guests} Guests</span>
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
                    ₹{total.toLocaleString("en-IN")}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </aside>


        <section className="lg:col-span-6 space-y-6">

          {/* ================= PERSONAL INFORMATION ================= */}
          <div className="rounded-2xl border bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <User className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Personal Information</h3>
                <p className="text-xs text-muted-foreground">
                  Enter your details as they appear on your ID
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input value={form.name} disabled />
              </div>

              <div>
                <Label>Email Address</Label>
                <Input
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span>
                        {form.dob
                          ? format(form.dob, "dd MMM yyyy")
                          : "Select date"}
                      </span>
                      <CalendarIcon className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    <Calendar
                      mode="single"
                      selected={form.dob}
                      onSelect={(d) =>
                        setForm((f) => ({ ...f, dob: d }))
                      }
                      captionLayout="dropdown"
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                      disabled={(d) => d > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Phone Number</Label>
                <Input value={form.phone} disabled />
              </div>
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
                  Your billing address for this reservation
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <Label>Street Address</Label>
                <Input
                  value={address.address}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, address: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Country</Label>
                <Select
                  value={address.country}
                  onValueChange={(v) =>
                    setAddress((a) => ({ ...a, country: v, state: "", city: "" }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.isoCode} value={c.isoCode}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>State</Label>
                <Select
                  value={address.state}
                  onValueChange={(v) =>
                    setAddress((a) => ({ ...a, state: v, city: "" }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statesList.map((s) => (
                      <SelectItem key={s.isoCode} value={s.isoCode}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>City</Label>
                <Select
                  value={address.city}
                  onValueChange={(v) =>
                    setAddress((a) => ({ ...a, city: v }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {citiesList.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Pincode</Label>
                <Input
                  value={address.pincode}
                  onChange={(e) =>
                    setAddress((a) => ({
                      ...a,
                      pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* ================= BOOKING PREFERENCES ================= */}
          <div className="rounded-2xl border bg-white p-5 sm:p-6 space-y-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Number of Guests</Label>
                <Select
                  value={guests}
                  onValueChange={(v) => {
                    setGuests(v);
                    setVegGuests(0);
                    setNonVegGuests(0);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* MEALS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={withMeal}
                  onCheckedChange={(v) => {
                    setWithMeal(v);
                    if (!v) {
                      setVegGuests(0);
                      setNonVegGuests(0);
                    }
                  }}
                />
                <Label className="leading-snug">
                  Include Meals
                  <span className="block text-xs text-muted-foreground">
                    Veg ₹{room.mealPriceVeg} / Non-Veg ₹{room.mealPriceNonVeg} per guest per night
                  </span>
                </Label>
              </div>

              {withMeal && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Veg Guests</Label>
                    <Input
                      type="number"
                      min={0}
                      value={vegGuests}
                      onChange={(e) =>
                        setVegGuests(Number(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div>
                    <Label>Non-Veg Guests</Label>
                    <Input
                      type="number"
                      min={0}
                      value={nonVegGuests}
                      onChange={(e) =>
                        setNonVegGuests(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================= CTA ================= */}
          <Button
            className="w-full h-12 text-base bg-red-700 hover:bg-red-800"
            onClick={proceed}
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