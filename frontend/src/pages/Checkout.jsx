import { useEffect, useMemo, useState } from "react";
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
import { Eye, EyeOff, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toDateOnlyFromAPI, toDateOnlyFromAPIUTC } from "../lib/date";
import { getAllCountries, getStatesByCountry, getCitiesByState } from "../lib/location";


function toDateOnly(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}
function toYMD(d) {
  return d ? format(new Date(d), "yyyy-MM-dd") : null;
}
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
const isValidPhone = (p) => /^[0-9]{10}$/.test(String(p).trim());

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, init } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [room, setRoom] = useState(null);
  const [withMeal, setWithMeal] = useState(false);
  const [errors, setErrors] = useState({});
  const [disabledAll, setDisabledAll] = useState([]);

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

  useEffect(() => {
    const c = getAllCountries();
    setCountries(c);
  }, []);

  useEffect(() => {
    if (addressInfo.country) {
      const s = getStatesByCountry(addressInfo.country);
      setStates(s);
    } else {
      setStates([]);
    }
    setCities([]);
  }, [addressInfo.country]);

  useEffect(() => {
    if (addressInfo.state && addressInfo.country) {
      const c = getCitiesByState(addressInfo.country, addressInfo.state);
      setCities(c);
    } else {
      setCities([]);
    }
  }, [addressInfo.state, addressInfo.country]);

  const roomId = state?.roomId;
  const startDate = state?.startDate ? new Date(state.startDate) : null;
  const endDate = state?.endDate ? new Date(state.endDate) : null;
  const guests = state?.guests ? Number(state.guests) : null;

  const [range, setRange] = useState({ from: startDate || null, to: endDate || null });
  const [guestsState, setGuestsState] = useState(String(guests || ""));
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    password: "",
    dob: user?.dob ? new Date(user.dob) : null,
  });

  useEffect(() => {
    if (!roomId || !startDate || !endDate || !guests) {
      toast.error("Please select a room, dates and guests first.");
      navigate("/", { replace: true });
    }
  }, [roomId, startDate, endDate, guests, navigate]);

  useEffect(() => {
    if (!roomId) return;
    api.get(`/rooms/${roomId}`).then(({ data }) => setRoom(data));
  }, [roomId]);

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
        setDisabledAll([]);
      }
    })();
  }, [roomId]);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: user.name || f.name,
        email: user.email || f.email,
        phone: user.phone || f.phone,
        dob: user.dob ? new Date(user.dob) : f.dob,
      }));
    }
  }, [user]);

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((f) => ({ ...f, phone: digits }));
  };

  const handlePincodeChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setAddressInfo((f) => ({ ...f, pincode: digits }));
  };


  const nights = useMemo(() => {
    if (!range?.from || !range?.to) return 0;
    const ms = toDateOnly(range.to) - toDateOnly(range.from);
    return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  }, [range]);

  const pricePerNight = useMemo(() => {
    if (!room) return 0;
    const base = room.pricePerNight || 0;
    const meal = withMeal && room.priceWithMeal > 0 ? room.priceWithMeal : 0;
    return base + meal;
  }, [room, withMeal]);

  const total = useMemo(() => {
    return nights ? nights * pricePerNight : 0;
  }, [nights, pricePerNight]);

  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!isValidEmail(form.email)) newErrors.email = "Invalid email format";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    else if (!isValidPhone(form.phone))
      newErrors.phone = "Enter a valid 10-digit phone number";
    if (!user && !form.password.trim())
      newErrors.password = "Password is required";
    if (!form.dob) newErrors.dob = "Date of birth is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Object.values(newErrors).forEach((msg) => toast.error(msg));
      return false;
    }
    return true;
  };

  const maxGuestsCap = useMemo(() => {
    if (!room) return 1;
    if (typeof room.maxGuests === "number" && room.maxGuests > 0)
      return room.maxGuests;

    const nums = (room.accommodation || [])
      .flatMap((s) =>
        Array.from(String(s).matchAll(/\d+/g)).map((m) => Number(m[0]))
      )
      .filter((n) => Number.isFinite(n) && n > 0);

    const sum = nums.length ? nums.reduce((a, b) => a + b, 0) : 0;
    return Math.max(1, sum || 1);
  }, [room]);

  async function ensureAuthed() {
    if (user) return;

    const { name, email, password, phone, dob } = form;
    if (!validateForm())
      throw new Error("Please correct the form before proceeding.");

    try {
      await api.post(
        "/auth/register",
        {
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          phone: phone.trim(),
          dob: dob ? dob.toISOString() : null,
        },
        { withCredentials: true }
      );
    } catch (e) {
      const already =
        e?.response?.status === 400 ||
        /already/i.test(String(e?.response?.data?.message || ""));
      if (!already) throw e;

      await api.post(
        "/auth/login",
        { email: email.trim(), password: password.trim() },
        { withCredentials: true }
      );
    }

    await api.get("/auth/me", { withCredentials: true });
    await init?.();
  }

  const onGuestsChange = (v) => setGuestsState(v);

  const proceed = async () => {
    try {
      if (!validateForm()) return;
      await ensureAuthed();

      const start = range?.from;
      const end = range?.to;
      const guests = Number(guestsState);

      if (!start || !end || !guests) {
        toast.error("Please select valid dates and guests.");
        return;
      }

      // conflict validation
      const conflict = disabledAll.some((b) => !(end < b.from || start > b.to));
      if (conflict) {
        toast.error("Selected dates include unavailable days. Please choose another range.");
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
        contactName: form.name,
        contactEmail: form.email,
        contactPhone: form.phone,
        address,
        country,
        state,
        city,
        pincode,
      });

      const rzp = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency || "INR",
        name: room.name,
        description: `Booking • ${nights} night(s)`,
        order_id: order.orderId,
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        notes: {
          roomId: room._id,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          guests: String(guests),
          withMeal: String(!!withMeal),
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
              contactName: form.name,
              contactEmail: form.email,
              contactPhone: form.phone,
            });
            toast.success("Payment successful! Booking confirmed.");
            navigate("/my-bookings", { replace: true });
          } catch (e) {
            toast.error(e?.response?.data?.message || "Verification failed");
          }
        },
        modal: { ondismiss: () => toast("Payment flow was cancelled.") },
      });

      rzp.open();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err.message || "Could not start payment"
      );
    }
  };

  if (!room) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-primary text-primary-foreground rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-lg sm:text-xl font-semibold">{room.name}</div>
        <div className="flex items-center gap-3 text-sm sm:text-base">
          <span>₹{room.pricePerNight}/night</span>
          <span className="opacity-70">|</span>
          <span>₹{room.priceWithMeal}/night with meal</span>
        </div>
      </div>

      <div className="rounded-xl border p-4 sm:p-6 space-y-5">
        {/* User Info */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your full name"
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label>Email</Label>
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
                  className={`w-full justify-start text-left font-normal ${!form.dob && "text-muted-foreground"
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
            />
            {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
          </div>

          {!user && (
            <div className="space-y-1 sm:col-span-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Create a password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs">{errors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                We’ll create your account or sign you in if it already exists.
              </p>
            </div>
          )}

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

          {/* City */}
          <div className="space-y-1">
            <Label>City</Label>
            <Select
              value={addressInfo.city}
              onValueChange={(v) =>
                setAddressInfo((f) => ({ ...f, city: v }))
              }
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
            onCheckedChange={(v) => setWithMeal(Boolean(v))}
          />
          <Label htmlFor="withMeal" className="cursor-pointer">
            Include meals (₹{room.priceWithMeal}/night)
          </Label>
        </div>

        <Separator className="my-2" />

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span>Nights</span>
            <span>{nights}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Price per night</span>
            <span>₹{pricePerNight}</span>
          </div>
          <div className="flex items-center justify-between font-medium text-base pt-1">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>

        <Button className="w-full mt-2" onClick={proceed}>
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}
