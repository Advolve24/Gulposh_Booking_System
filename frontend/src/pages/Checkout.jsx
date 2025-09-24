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
import { Eye, EyeOff } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";


function toDateOnly(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}
function formatDate(d) {
  return d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";
}
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
const isValidPhone = (p) => {
  const digits = String(p || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, register, login, init } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const roomId = state?.roomId;
  const startDate = state?.startDate ? new Date(state.startDate) : null;
  const endDate = state?.endDate ? new Date(state.endDate) : null;
  const guests = state?.guests ? Number(state.guests) : null;
  const [range, setRange] = useState({ from: startDate || null, to: endDate || null });
  const [guestsState, setGuestsState] = useState(String(guests || ""));


  const [room, setRoom] = useState(null);

  const maxGuestsCap = useMemo(() => {
    if (!room) return null;
    if (typeof room.maxGuests === "number" && room.maxGuests > 0) return room.maxGuests;

    const nums = (room.accommodation || [])
      .flatMap((s) => Array.from(String(s).matchAll(/\d+/g)).map((m) => Number(m[0])))
      .filter((n) => Number.isFinite(n) && n > 0);

    const sum = nums.length ? nums.reduce((a, b) => a + b, 0) : 0;
    return Math.max(1, sum || 1);
  }, [room]);

  const [withMeal, setWithMeal] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    password: "",
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
    if (user) {
      setForm((f) => ({
        ...f,
        name: user.name || f.name,
        email: user.email || f.email,
      }));
    }
  }, [user]);

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const ms = toDateOnly(endDate) - toDateOnly(startDate);
    return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  }, [startDate, endDate]);

  const pricePerNight = useMemo(() => {
    if (!room) return 0;
    return withMeal && room.priceWithMeal > 0 ? room.priceWithMeal : room.pricePerNight || 0;
  }, [room, withMeal]);

  const total = useMemo(() => (nights ? nights * pricePerNight : 0), [nights, pricePerNight]);

  async function ensureAuthed() {
    if (user) return;

    const { name, email, password } = form;
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      throw new Error("Please fill name, email and password.");
    }

    try {
      await api.post("/auth/register", { name: name.trim(), email: email.trim(), password: password.trim() }, { withCredentials: true });
    } catch (e) {
      const already = e?.response?.status === 400 || /already/i.test(String(e?.response?.data?.message || ""));
      if (!already) throw e;
      await api.post("/auth/login", { email: email.trim(), password: password.trim() }, { withCredentials: true });
    }

    await api.get("/auth/me", { withCredentials: true });
    await init?.();
  }

  const onGuestsChange = (v) => {
    setGuestsState(v);
  };



  const proceed = async () => {
    try {
      await ensureAuthed();

      const start = range?.from;
      const end = range?.to;
      const guests = Number(guestsState);

      if (!start || !end || !guests) {
        toast.error("Please select dates and guests.");
        return;
      }
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load Razorpay");

      const { data: order } = await api.post("/payments/create-order", {
        roomId: room._id,
        startDate: start,
        endDate: end,
        guests,
        withMeal,
        contactName: form.name,
        contactEmail: form.email,
        contactPhone: form.phone,
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
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          guests: String(guests),
          withMeal: String(!!withMeal),
        },
        theme: { color: "#BA081C" },

        handler: async (resp) => {
          try {
            const { data } = await api.post("/payments/verify", {
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_signature: resp.razorpay_signature,

              roomId: room._id,
              startDate,
              endDate,
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

        modal: {
          ondismiss: () => {
            toast("Payment flow was cancelled.");
          },
        },
      });

      rzp.open();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Could not start payment");
    }
  };

  if (!room) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top banner */}
      <div className="bg-primary text-primary-foreground rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-lg sm:text-xl font-semibold">{room.name}</div>
        <div className="flex items-center gap-3 text-sm sm:text-base">
          <span>₹{room.pricePerNight}/night</span>
          <span className="opacity-70">|</span>
          <span>₹{room.priceWithMeal}/night with meal</span>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-xl border p-4 sm:p-6 space-y-5">
        {/* Account / Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
          {!user && (
            <div className="space-y-1 sm:col-span-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Create a password"
                  className="pr-10" // add some space for the button
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                We’ll create your account or sign you in if it already exists.
              </p>
            </div>
          )}

        </div>

        {/* Dates & Guests Editable */}
        <div className="grid w-full grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Check-in / Check-out</Label>
            <CalendarRange
              value={range}
              onChange={setRange}
              numberOfMonths={1}
              disabledRanges={[]}
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label>Guests</Label>
            <Select value={guestsState} onValueChange={onGuestsChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select guests" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.max(1, maxGuestsCap || 1) }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>

          </div>
        </div>



        {/* With meal */}
        <div className="flex items-center gap-3 pt-2">
          <Checkbox id="withMeal" checked={withMeal} onCheckedChange={(v) => setWithMeal(Boolean(v))} />
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

        <Button className="w-full mt-2" onClick={proceed} disabled={!startDate || !endDate || !guests}>
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}
