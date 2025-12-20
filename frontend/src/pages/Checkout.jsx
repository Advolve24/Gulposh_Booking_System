import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { loadRazorpayScript } from "../lib/loadRazorpay";
import { toast } from "sonner";
import CalendarRange from "../components/CalendarRange";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toDateOnlyFromAPI, toDateOnlyFromAPIUTC } from "../lib/date";
import { getAllCountries, getStatesByCountry, getCitiesByState } from "../lib/location";

// ✅ Firebase OTP
import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRecaptchaVerifier } from "@/lib/recaptcha";

function toDateOnly(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}
function toYMD(d) {
  return d ? format(new Date(d), "yyyy-MM-dd") : null;
}
const isValidEmail = (e) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
const isValidPhone = (p) => /^[0-9]{10}$/.test(String(p).trim());

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const { user, init, phoneLogin } = useAuth();

  /** ---------- UI State ---------- */
  const [room, setRoom] = useState(null);
  const [withMeal, setWithMeal] = useState(false);
  const [errors, setErrors] = useState({});
  const [disabledAll, setDisabledAll] = useState([]);

  /** -------- OTP state (Inline) -------- */
  const [otpStep, setOtpStep] = useState("idle"); // idle | sent | verified
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // when user clicks proceed while not logged in, we set this = true and continue after otp verification
  const pendingProceedRef = useRef(false);

  /** --------- Meal guest splits ---------- */
  const [vegGuests, setVegGuests] = useState(0);
  const [nonVegGuests, setNonVegGuests] = useState(0);
  const [comboGuests, setComboGuests] = useState(0);

  /** ---------- Country/State/City ---------- */
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [addressInfo, setAddressInfo] = useState({
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  /** ---------- Location State ---------- */
  const roomId = state?.roomId;
  const startDate = state?.startDate ? new Date(state.startDate) : null;
  const endDate = state?.endDate ? new Date(state.endDate) : null;
  const guests = state?.guests ? Number(state.guests) : null;

  const [range, setRange] = useState({
    from: startDate || null,
    to: endDate || null,
  });

  const [guestsState, setGuestsState] = useState(String(guests || ""));

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    dob: user?.dob ? new Date(user.dob) : null,
  });

  /** -------- Load countries -------- */
  useEffect(() => {
    setCountries(getAllCountries());
  }, []);

  /** -------- On country change -------- */
  useEffect(() => {
    if (addressInfo.country) {
      setStates(getStatesByCountry(addressInfo.country));
    } else {
      setStates([]);
    }
    setCities([]);
  }, [addressInfo.country]);

  /** -------- On state change -------- */
  useEffect(() => {
    if (addressInfo.state && addressInfo.country) {
      setCities(getCitiesByState(addressInfo.country, addressInfo.state));
    } else {
      setCities([]);
    }
  }, [addressInfo.state, addressInfo.country]);

  /** -------- Validate initial selection -------- */
  useEffect(() => {
    if (!roomId || !startDate || !endDate || !guests) {
      toast.error("Please select a room, dates and guests first.");
      navigate("/", { replace: true });
    }
  }, [roomId, startDate, endDate, guests, navigate]);

  /** -------- Load room -------- */
  useEffect(() => {
    if (!roomId) return;
    api.get(`/rooms/${roomId}`).then(({ data }) => setRoom(data));
  }, [roomId]);

  /** -------- Load Disabled Dates -------- */
  useEffect(() => {
    if (!roomId) return;
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

        setDisabledAll([...bookings, ...blackouts]);
      } catch (err) {
        console.error("Failed to load disabled ranges:", err);
      }
    })();
  }, [roomId]);

  /** -------- Sync user data -------- */
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: user.name || f.name,
        email: user.email || f.email,
        phone: user.phone || f.phone,
        dob: user.dob ? new Date(user.dob) : f.dob,
      }));
      setOtpStep("verified");
    } else {
      // when user logs out and comes back
      setOtpStep("idle");
      setOtp("");
    }
  }, [user]);

  /** -------- Form Handlers -------- */
  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((f) => ({ ...f, phone: digits }));
    // If phone is changed after otp sent, reset otp flow
    setOtp("");
    setOtpStep("idle");
  };

  const handlePincodeChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setAddressInfo((f) => ({ ...f, pincode: digits }));
  };

  /** -------- Nights Calculation -------- */
  const nights = useMemo(() => {
    if (!range?.from || !range?.to) return 0;
    const ms = toDateOnly(range.to) - toDateOnly(range.from);
    return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  }, [range]);

  /** -------- Room charges -------- */
  const roomTotal = useMemo(() => {
    if (!room) return 0;
    if (!nights) return 0;
    return nights * Number(room.pricePerNight || 0);
  }, [room, nights]);

  /** -------- Meal charges -------- */
  const mealTotal = useMemo(() => {
    if (!room || !withMeal) return 0;

    return (
      nights *
      (vegGuests * Number(room.mealPriceVeg || 0) +
        nonVegGuests * Number(room.mealPriceNonVeg || 0)) +
      comboGuests * Number(room.mealPriceCombo || 0)
    );
  }, [nights, withMeal, vegGuests, nonVegGuests, comboGuests, room]);

  /** -------- Grand Total -------- */
  const total = useMemo(() => roomTotal + mealTotal, [roomTotal, mealTotal]);

  /** -------- Validate form -------- */
  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "Name is required";

    // email optional
    if (form.email && !isValidEmail(form.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    else if (!isValidPhone(form.phone))
      newErrors.phone = "Enter a valid 10-digit phone number";

    if (!form.dob) newErrors.dob = "Date of birth is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Object.values(newErrors).forEach((msg) => toast.error(msg));
      return false;
    }
    return true;
  };

  /** -------- Auto-detect max guests from accommodation -------- */
  const maxGuestsCap = useMemo(() => {
    if (!room) return 1;

    const nums = (room.accommodation || [])
      .flatMap((s) =>
        Array.from(String(s).matchAll(/\d+/g)).map((m) => Number(m[0]))
      )
      .filter((n) => Number.isFinite(n) && n > 0);

    const sum = nums.length ? nums.reduce((a, b) => a + b, 0) : 0;
    return Math.max(1, sum || 1);
  }, [room]);

  const onGuestsChange = (v) => {
    setGuestsState(v);
    setVegGuests(0);
    setNonVegGuests(0);
    setComboGuests(0);
  };

  /** ================= OTP: Send ================= */
  const sendOtp = async () => {
    if (!form.phone || !isValidPhone(form.phone)) {
      toast.error("Enter valid 10-digit phone number");
      return;
    }
    try {
      setOtpLoading(true);
      const appVerifier = getRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(
        auth,
        `+91${form.phone}`,
        appVerifier
      );
      window.confirmationResult = confirmation;
      setOtpStep("sent");
      toast.success("OTP sent");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send OTP. Try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  /** ================= OTP: Verify ================= */
  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Enter valid 6-digit OTP");
      return;
    }
    try {
      setOtpLoading(true);

      // verify with firebase
      await window.confirmationResult.confirm(otp);

      // login/register in backend
      await phoneLogin({
        phone: form.phone,
        name: form.name,
        email: form.email || undefined,
        dob: form.dob ? form.dob.toISOString() : null,
      });

      await init?.();

      setOtpStep("verified");
      toast.success("Mobile verified");

      // If user clicked proceed earlier, continue automatically
      if (pendingProceedRef.current) {
        pendingProceedRef.current = false;
        await proceedToPayment();
      }
    } catch (err) {
      console.error(err);
      toast.error("Invalid OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  /** ======= COMMON payment block extracted so we can call after OTP ======= */
  const proceedToPayment = async () => {
    const start = range?.from;
    const end = range?.to;
    const guests = Number(guestsState);

    if (!start || !end || !guests) {
      toast.error("Please select valid dates and guests.");
      return;
    }

    if (withMeal) {
      if (vegGuests + nonVegGuests + comboGuests !== guests) {
        toast.error("Veg + Non-Veg + Combo must match total guests.");
        return;
      }
    }

    const conflict = disabledAll.some((b) => !(end < b.from || start > b.to));
    if (conflict) {
      toast.error("Selected dates include unavailable days. Choose another range.");
      return;
    }

    const ok = await loadRazorpayScript();
    if (!ok) throw new Error("Failed to load Razorpay");

    const { address, country, state, city, pincode } = addressInfo;

    const { data: order } = await api.post("/payments/create-order", {
      roomId: room._id,
      startDate: toYMD(start),
      endDate: toYMD(end),
      guests,
      withMeal,
      vegGuests,
      nonVegGuests,
      comboGuests,
      address,
      country,
      state,
      city,
      pincode,
      contactName: form.name,
      contactEmail: form.email || null,
      contactPhone: form.phone,
    });

    const rzp = new window.Razorpay({
      key: order.key,
      amount: order.amount,
      currency: "INR",
      name: room.name,
      description: `Booking • ${nights} night(s)`,
      order_id: order.orderId,
      prefill: {
        name: form.name,
        email: form.email || "",
        contact: form.phone,
      },
      notes: {
        roomId: room._id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        guests: String(guests),
        withMeal: String(!!withMeal),
        vegGuests: String(vegGuests),
        nonVegGuests: String(nonVegGuests),
        comboGuests: String(comboGuests),
      },
      theme: { color: "#BA081C" },

      handler: async (resp) => {
        try {
          await api.post("/payments/verify", {
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_signature: resp.razorpay_signature,
            roomId: room._id,
            startDate: toYMD(start),
            endDate: toYMD(end),
            guests,
            withMeal,
            vegGuests,
            nonVegGuests,
            comboGuests,
            contactName: form.name,
            contactEmail: form.email || null,
            contactPhone: form.phone,
            address,
            country,
            state,
            city,
            pincode,
          });

          toast.success("Payment successful! Booking confirmed.");
          navigate("/my-bookings", { replace: true });
        } catch (e) {
          toast.error(e?.response?.data?.message || "Verification failed");
        }
      },

      modal: {
        ondismiss: () => toast("Payment was cancelled."),
      },
    });

    rzp.open();
  };

  /** -------- PROCEED button -------- */
  const proceed = async () => {
    try {
      if (!validateForm()) return;

      // 🚨 OTP Gate
      if (!user) {
        pendingProceedRef.current = true;
        toast.info("Please verify your mobile number to continue.");

        // If OTP not sent yet, send OTP
        if (otpStep === "idle") {
          await sendOtp();
        }
        return;
      }

      await proceedToPayment();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err.message || "Could not start payment"
      );
    }
  };

  if (!room) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* ✅ reCAPTCHA container (must exist in DOM) */}
      <div id="recaptcha-container" />

      <div className="bg-primary text-primary-foreground rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-lg sm:text-xl font-semibold">{room.name}</div>
        <div className="flex items-center gap-3 text-sm sm:text-base">
          <span>₹{room.pricePerNight}/night</span>
        </div>
      </div>

      <div className="rounded-xl border p-4 sm:p-6 space-y-5">
        {/* User Info */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Your full name"
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label>Email (optional)</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label>Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !form.dob && "text-muted-foreground"
                  }`}
                >
                  {form.dob ? format(form.dob, "PPP") : "Select date of birth"}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.dob}
                  onSelect={(date) => setForm((f) => ({ ...f, dob: date }))}
                  captionLayout="dropdown"
                  fromYear={1950}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
            {errors.dob && <p className="text-red-500 text-xs">{errors.dob}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="10-digit mobile number"
              disabled={!!user} // after login, don't allow change here
            />
            {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}

            {/* ✅ Inline OTP UI */}
            {!user && (
              <div className="mt-3 space-y-2">
                {otpStep === "idle" && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={sendOtp}
                    disabled={otpLoading}
                  >
                    {otpLoading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                )}

                {otpStep === "sent" && (
                  <div className="space-y-2">
                    <Input
                      inputMode="numeric"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                    />
                    <Button
                      type="button"
                      className="w-full"
                      onClick={verifyOtp}
                      disabled={otpLoading}
                    >
                      {otpLoading ? "Verifying..." : "Verify OTP"}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={sendOtp}
                      disabled={otpLoading}
                    >
                      Resend OTP
                    </Button>
                  </div>
                )}

                {otpStep === "verified" && (
                  <p className="text-xs text-green-600">Mobile number verified ✅</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label>Address</Label>
            <Input
              placeholder="Street, Apartment, Landmark"
              value={addressInfo.address}
              onChange={(e) =>
                setAddressInfo((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label>Country</Label>
            <Select
              value={addressInfo.country}
              onValueChange={(v) =>
                setAddressInfo((f) => ({
                  ...f,
                  country: v,
                  state: "",
                  city: "",
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {countries.map((c) => (
                  <SelectItem key={c.isoCode} value={c.isoCode}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>State</Label>
            <Select
              value={addressInfo.state}
              onValueChange={(v) =>
                setAddressInfo((f) => ({ ...f, state: v, city: "" }))
              }
              disabled={!addressInfo.country}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {states.map((s) => (
                  <SelectItem key={s.isoCode} value={s.isoCode}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>City</Label>
            <Select
              value={addressInfo.city}
              onValueChange={(v) => setAddressInfo((f) => ({ ...f, city: v }))}
              disabled={!addressInfo.state}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {cities.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Postal / Zip Code</Label>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="Enter 6-digit postal code"
              value={addressInfo.pincode}
              onChange={handlePincodeChange}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label>Guests</Label>
            <Select value={guestsState} onValueChange={onGuestsChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select guests" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxGuestsCap }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dates & Guests */}
        <div className="grid w-full grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Check-in / Check-out</Label>
            <CalendarRange
              value={range}
              onChange={setRange}
              numberOfMonths={1}
              disabledRanges={disabledAll}
            />
          </div>
        </div>

        {/* With meal */}
        <div className="flex items-center gap-3 pt-2">
          <Checkbox
            id="withMeal"
            checked={withMeal}
            onCheckedChange={(v) => {
              setWithMeal(Boolean(v));
              if (!v) {
                setVegGuests(0);
                setNonVegGuests(0);
                setComboGuests(0);
              }
            }}
          />
          <Label htmlFor="withMeal" className="cursor-pointer flex items-center gap-1">
            Include meals
            {room && (
              <span className="text-xs text-muted-foreground">
                (Veg ₹{room.mealPriceVeg || 0} | Non-Veg ₹{room.mealPriceNonVeg || 0} | Combo ₹{room.mealPriceCombo || 0} per guest)
              </span>
            )}
          </Label>
        </div>

        {withMeal && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <div>
                <Label>Veg Guests</Label>
                <Input
                  type="number"
                  min="0"
                  max={Number(guestsState) - nonVegGuests - comboGuests}
                  value={vegGuests}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= Number(guestsState) - nonVegGuests - comboGuests) {
                      setVegGuests(val);
                    }
                  }}
                />
              </div>

              <div>
                <Label>Non-Veg Guests</Label>
                <Input
                  type="number"
                  min="0"
                  max={Number(guestsState) - vegGuests - comboGuests}
                  value={nonVegGuests}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= Number(guestsState) - vegGuests - comboGuests) {
                      setNonVegGuests(val);
                    }
                  }}
                />
              </div>

              <div>
                <Label>Combo Meal Guests</Label>
                <Input
                  type="number"
                  min="0"
                  max={Number(guestsState) - vegGuests - nonVegGuests}
                  value={comboGuests}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= Number(guestsState) - vegGuests - nonVegGuests) {
                      setComboGuests(val);
                    }
                  }}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              Veg + Non-Veg + ComboMeal must equal total guests.
            </p>
          </>
        )}

        <Separator className="my-2" />

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span>Nights</span>
            <span>{nights}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Room Total</span>
            <span>₹{roomTotal.toLocaleString("en-IN")}</span>
          </div>

          {withMeal && (
            <div className="flex items-center justify-between">
              <span>Meal Total</span>
              <span>₹{mealTotal.toLocaleString("en-IN")}</span>
            </div>
          )}

          <div className="flex items-center justify-between font-medium text-base pt-1">
            <span>Total</span>
            <span>₹{total.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <Button className="w-full mt-2" onClick={proceed}>
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}
