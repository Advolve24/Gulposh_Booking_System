import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import CalendarRange from "../components/CalendarRange";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff } from "lucide-react";
import { loadRazorpayScript } from "../lib/loadRazorpay";
import { toDateOnlyFromAPIUTC, toDateOnlyUTC } from "../lib/date";
import { toast } from "sonner";
import { format } from "date-fns";

function mergeRanges(ranges) {
  if (!ranges || !ranges.length) return [];
  const sorted = ranges
    .map(r => ({ from: new Date(r.from), to: new Date(r.to) }))
    .sort((a, b) => a.from - b.from);

  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    const dayAfterLast = new Date(
      last.to.getUTCFullYear(),
      last.to.getUTCMonth(),
      last.to.getUTCDate() + 1
    );
    if (cur.from <= dayAfterLast) {
      if (cur.to > last.to) last.to = cur.to;
    } else {
      out.push(cur);
    }
  }
  return out;
}

export default function RoomPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [room, setRoom] = useState(null);
  const [range, setRange] = useState();
  const [guests, setGuests] = useState("");
  const [bookedAll, setBookedAll] = useState([]);
  const [blackoutRanges, setBlackoutRanges] = useState([]);

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [withMeal, setWithMeal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    api.get(`/rooms/${id}`).then(({ data }) => setRoom(data)).catch(() => setRoom(null));

    (async () => {
      try {
        const res = await api.get("/rooms/disabled/all");
        if (Array.isArray(res.data)) {
          setBookedAll(
            res.data.map(b => {
              const from = toDateOnlyFromAPIUTC(b.from || b.startDate);
              const to = toDateOnlyFromAPIUTC(b.to || b.endDate);
              return { from, to };
            })
          );
        }
      } catch (_) {}
    })();

    api.get("/blackouts").then(({ data }) => {
      const ranges = (data || []).map(b => ({
        from: toDateOnlyFromAPIUTC(b.from),
        to: toDateOnlyFromAPIUTC(b.to),
      }));
      setBlackoutRanges(ranges);
    });
  }, [id]);

  useEffect(() => {
    const stateFrom = location.state?.from;
    const stateTo = location.state?.to;
    const stateGuests = location.state?.guests;

    const qpFrom = searchParams.get("from");
    const qpTo = searchParams.get("to");
    const qpGuests = searchParams.get("guests");

    const fromISO = stateFrom || qpFrom;
    const toISO = stateTo || qpTo;

    if (fromISO && toISO) {
      const from = toDateOnlyUTC(fromISO);
      const to = toDateOnlyUTC(toISO);
      if (!isNaN(from) && !isNaN(to)) setRange({ from, to });
    }
    const g = stateGuests || qpGuests;
    if (g) setGuests(String(g));
  }, []); 
  useEffect(() => {
    const sp = new URLSearchParams(searchParams);
    if (range?.from && range?.to) {
      sp.set("from", format(range.from, "yyyy-MM-dd"));
      sp.set("to", format(range.to, "yyyy-MM-dd"));
    } else {
      sp.delete("from"); sp.delete("to");
    }
    setSearchParams(sp, { replace: true });
  }, [range]);

  const onGuestsChange = (v) => {
    setGuests(v);
    const sp = new URLSearchParams(searchParams);
    if (v) sp.set("guests", v); else sp.delete("guests");
    setSearchParams(sp, { replace: true });
  };

  const maxGuestsCap = useMemo(() => {
    if (!room) return null;
    if (typeof room.maxGuests === "number" && room.maxGuests > 0) return room.maxGuests;

    const nums = (room.accommodation || [])
      .flatMap((s) => Array.from(String(s).matchAll(/\d+/g)).map((m) => Number(m[0])))
      .filter((n) => Number.isFinite(n) && n > 0);

    const sum = nums.length ? nums.reduce((a, b) => a + b, 0) : 0;
    return Math.max(1, sum || 1);
  }, [room]);

  useEffect(() => {
    if (!room || !maxGuestsCap || !guests) return;
    const g = Number(guests);
    if (Number.isFinite(g) && g > maxGuestsCap) {
      setGuests(String(maxGuestsCap));
    }
  }, [room, maxGuestsCap, guests]);

  const disabledAll = useMemo(
    () => mergeRanges([...(blackoutRanges || []), ...(bookedAll || [])]),
    [blackoutRanges, bookedAll]
  );

  const nights = useMemo(() => {
    if (!range?.from || !range?.to) return 0;
    const ms = toDateOnlyUTC(range.to) - toDateOnlyUTC(range.from);
    return Math.max(0, ms / (1000 * 60 * 60 * 24));
  }, [range]);

  const pricePerNight = useMemo(() => {
    if (!room) return 0;
    return withMeal && room.priceWithMeal > 0 ? room.priceWithMeal : room.pricePerNight || 0;
  }, [room, withMeal]);

  const total = useMemo(() => (nights ? nights * pricePerNight : 0), [nights, pricePerNight]);

  async function ensureUserExists() {
    const { name, email, phone, password } = form;
    if (!name.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      throw new Error("Fill name, email, phone and password");
    }

    try {
      await api.post("/auth/register", { name, email, phone, password });
    } catch (e) {
      const msg = e?.response?.data?.message || "";
      if (/already/i.test(msg) || e?.response?.status === 400) {
        toast.info("User already exists, proceeding with booking.");
        return;
      }
      throw e;
    }
  }

  const proceed = async () => {
    try {
      await ensureUserExists();

      const start = toDateOnlyUTC(range.from);
      const end = toDateOnlyUTC(range.to);
      const g = Number(guests);

      if (!start || !end || !g) {
        toast.error("Please select dates and guests.");
        return;
      }
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load Razorpay");

      const { data: order } = await api.post("/payments/create-order", {
        roomId: room._id,
        startDate: start,
        endDate: end,
        guests: g,
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
        prefill: { name: form.name, email: form.email, contact: form.phone },
        notes: {
          roomId: room._id,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          guests: String(g),
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
              startDate: start,
              endDate: end,
              guests: g,
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
      toast.error(err?.response?.data?.message || err.message || "Could not start payment");
    }
  };

  if (!room) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 flex flex-wrap justify-between items-start">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
        <h1 className="text-xl sm:text-2xl font-bold">{room.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-center sm:text-left">
          <span className="text-lg sm:text-xl">₹{room.pricePerNight}/night</span>
          <div className="hidden sm:block h-5 w-px bg-border" />
          <span className="text-lg sm:text-xl">(₹{room.priceWithMeal}/night with meal)</span>
        </div>
      </div>

      <div className="w-[38.5%] flex bg-white rounded-[10px] p-4 flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="w-full md:w-full shadow-lg border p-4 rounded-xl space-y-4">
          <CalendarRange
            value={range}
            onChange={setRange}
            numberOfMonths={1}
            disabledRanges={disabledAll}
          />
          <div>
            <label className="block text-sm mb-1">
              Guests {maxGuestsCap ? `(max ${maxGuestsCap})` : ""}
            </label>
            <Select value={guests} onValueChange={onGuestsChange}>
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
      </div>

      <div className="rounded-xl border p-4 sm:p-6 space-y-5 w-[58%] bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Password for this user"
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
          </div>
        </div>

\        <div className="flex items-center gap-3 pt-2">
          <Checkbox id="withMeal" checked={withMeal} onCheckedChange={(v) => setWithMeal(Boolean(v))} />
          <Label htmlFor="withMeal" className="cursor-pointer">
            Include meals (₹{room.priceWithMeal}/night)
          </Label>
        </div>

        <Separator className="my-2" />

\        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between"><span>Nights</span><span>{nights}</span></div>
          <div className="flex items-center justify-between"><span>Price per night</span><span>₹{pricePerNight}</span></div>
          <div className="flex items-center justify-between font-medium text-base pt-1"><span>Total</span><span>₹{total}</span></div>
        </div>

        <Button className="w-full mt-2" onClick={proceed} disabled={!range?.from || !range?.to || !guests}>
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}
