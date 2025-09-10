// src/pages/Checkout.jsx
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

function toDateOnly(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}
function formatDate(d) {
  return d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";
}
// simple validators
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
const isValidPhone = (p) => {
  const digits = String(p || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, register, login, init } = useAuth(); // <-- from store

  const roomId = state?.roomId;
  const startDate = state?.startDate ? new Date(state.startDate) : null;
  const endDate = state?.endDate ? new Date(state.endDate) : null;
  const guests = state?.guests ? Number(state.guests) : null;

  const [room, setRoom] = useState(null);
  const [withMeal, setWithMeal] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    password: "",
  });

  // Guard
  useEffect(() => {
    if (!roomId || !startDate || !endDate || !guests) {
      toast.error("Please select a room, dates and guests first.");
      navigate("/", { replace: true });
    }
  }, [roomId, startDate, endDate, guests, navigate]);

  // Load room info
  useEffect(() => {
    if (!roomId) return;
    api.get(`/rooms/${roomId}`).then(({ data }) => setRoom(data));
  }, [roomId]);

  // If user becomes available, hydrate name/email
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

  // If pricing is per guest, change to: nights * pricePerNight * (guests || 1)
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

  // Force a round-trip that requires the cookie
  await api.get("/auth/me", { withCredentials: true });
  await init?.();    // refresh the header/user store
}


  const proceed = async () => {
    try {
      await ensureAuthed();

      // 1) Load widget
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load Razorpay");

      // 2) Ask backend to create an order (server recomputes pricing!)
      const { data: order } = await api.post("/payments/create-order", {
        roomId: room._id,
        startDate,
        endDate,
        guests,
        withMeal,
        contactName: form.name,
        contactEmail: form.email,
        contactPhone: form.phone,
      });

      // 3) Open Razorpay
      const rzp = new window.Razorpay({
        key: order.key,
        amount: order.amount, // paise
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
        theme: { color: "#BA081C" }, // your primary

        handler: async (resp) => {
          // 4) Verify payment on backend and create booking
          try {
            const { data } = await api.post("/payments/verify", {
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_signature: resp.razorpay_signature,

              // send checkout fields so backend stores them too
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
            // You can redirect to a booking details page later:
            // navigate(`/my-bookings/${data.booking._id}`);
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
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Create a password"
              />
              <p className="text-xs text-muted-foreground">
                We’ll create your account or sign you in if it already exists.
              </p>
            </div>
          )}
        </div>

        {/* Booking summary (readonly) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Check-in</Label>
            <Input value={formatDate(startDate)} readOnly />
          </div>
          <div className="space-y-1">
            <Label>Check-out</Label>
            <Input value={formatDate(endDate)} readOnly />
          </div>
          <div className="space-y-1">
            <Label>Guests</Label>
            <Input value={String(guests || "")} readOnly />
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
