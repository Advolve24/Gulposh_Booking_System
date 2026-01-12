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

  /* ================= OTP ================= */
  // const sendOtp = async () => {
  //   if (!isValidPhone(form.phone)) {
  //     toast.error("Invalid phone number");
  //     return;
  //   }
  //   const verifier = getRecaptchaVerifier();
  //   const res = await signInWithPhoneNumber(
  //     auth,
  //     `+91${form.phone}`,
  //     verifier
  //   );
  //   window.confirmationResult = res;
  //   setOtpStep("sent");
  //   toast.success("OTP sent");
  // };

  // const verifyOtp = async () => {
  //   await window.confirmationResult.confirm(otp);
  //   await phoneLogin({
  //     phone: form.phone,
  //     name: form.name,
  //     email: form.email,
  //     dob: form.dob?.toISOString(),
  //   });
  //   await init();
  //   setOtpStep("verified");

  //   if (pendingProceedRef.current) {
  //     pendingProceedRef.current = false;
  //     proceedPayment();
  //   }
  // };

  /* ================= PAYMENT ================= */
  const proceedPayment = async () => {
  const g = Number(guests);

  /* ================= VALIDATION ================= */
  if (withMeal && vegGuests + nonVegGuests !== g) {
    toast.error("Veg + Non-Veg guests must equal total guests");
    return;
  }

  /* ================= LOAD RAZORPAY ================= */
  const ok = await loadRazorpayScript();
  if (!ok) {
    toast.error("Failed to load payment gateway");
    return;
  }

  /* ================= CREATE ORDER ================= */
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

  /* ================= RAZORPAY ================= */
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

    /* ================= PAYMENT SUCCESS ================= */
    handler: (resp) => {
      // ✅ 1. INSTANT USER CONFIRMATION
      toast.success(
        "Payment successful 🎉 Your booking is being confirmed"
      );

      // ✅ 2. INSTANT REDIRECT
      navigate("/my-bookings");

      // ✅ 3. VERIFY IN BACKGROUND (NO await)
      api.post("/payments/verify", {
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
      }).catch((err) => {
        console.error("Background verification failed:", err);
        // optional: log to DB / Slack
      });
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

  /* ================= UI ================= */
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div id="recaptcha-container" />

      <div className="border rounded-xl p-6 space-y-6 bg-white">

        {/* PROFILE */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} disabled />
          </div>

          <div>
            <Label>Email</Label>
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
                <Button variant="outline" className="w-full justify-start">
                  {form.dob ? format(form.dob, "PPP") : "Select date"}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  selected={form.dob}
                  onSelect={(d) =>
                    setForm((f) => ({ ...f, dob: d }))
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Phone</Label>
            <Input value={form.phone} disabled />
          </div>
        </div>

        {/* ADDRESS */}
        <div>
          <Label>Address</Label>
          <Input
            value={address.address}
            onChange={(e) =>
              setAddress((a) => ({ ...a, address: e.target.value }))
            }
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
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

        {/* GUESTS */}
        <div>
          <Label>Guests</Label>
          <Select value={guests} onValueChange={setGuests}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1,2,3,4,5,6].map(n => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* MEALS */}
        <div className="flex items-center gap-2">
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
          <Label>Include meals</Label>
        </div>

        {withMeal && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Veg Guests</Label>
              <Input
                type="number"
                min={0}
                max={Number(guests) - nonVegGuests}
                value={vegGuests}
                onChange={(e) => setVegGuests(Number(e.target.value))}
              />
            </div>

            <div>
              <Label>Non-Veg Guests</Label>
              <Input
                type="number"
                min={0}
                max={Number(guests) - vegGuests}
                value={nonVegGuests}
                onChange={(e) => setNonVegGuests(Number(e.target.value))}
              />
            </div>

            <p className="col-span-2 text-xs text-muted-foreground">
              Veg + Non-Veg must equal total guests ({guests})
            </p>
          </div>
        )}

        <Separator />

        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>₹{total.toLocaleString("en-IN")}</span>
        </div>

        <Button className="w-full bg-red-700" onClick={proceed}>
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}
