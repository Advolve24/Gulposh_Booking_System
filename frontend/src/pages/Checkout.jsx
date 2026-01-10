import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../store/authStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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

import { loadRazorpayScript } from "../lib/loadRazorpay";
import { toDateOnlyFromAPI, toDateOnlyFromAPIUTC } from "../lib/date";
import {
  getAllCountries,
  getStatesByCountry,
  getCitiesByState,
} from "../lib/location";

/* ================= HELPERS ================= */
function toDateOnly(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}
function toYMD(d) {
  return d ? format(new Date(d), "yyyy-MM-dd") : null;
}
const isValidEmail = (e) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  /* 🔐 Protect checkout */
  useEffect(() => {
    if (!user) {
      toast.info("Please sign in to continue booking");
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  /* ---------- Location state ---------- */
  const roomId = state?.roomId;
  const startDate = state?.startDate ? new Date(state.startDate) : null;
  const endDate = state?.endDate ? new Date(state.endDate) : null;
  const guestsFromState = state?.guests ? Number(state.guests) : null;

  /* ---------- UI state ---------- */
  const [room, setRoom] = useState(null);
  const [withMeal, setWithMeal] = useState(false);
  const [vegGuests, setVegGuests] = useState(0);
  const [nonVegGuests, setNonVegGuests] = useState(0);
  const [errors, setErrors] = useState({});
  const [disabledAll, setDisabledAll] = useState([]);

  const [range, setRange] = useState({
    from: startDate,
    to: endDate,
  });

  const [guestsState, setGuestsState] = useState(
    String(guestsFromState || "")
  );

  /* ---------- Profile form ---------- */
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: null,
  });

  const [addressInfo, setAddressInfo] = useState({
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  /* ---------- Autofill from profile ---------- */
  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      dob: user.dob ? new Date(user.dob) : null,
    });

    setAddressInfo({
      address: user.address || "",
      country: user.country || "",
      state: user.state || "",
      city: user.city || "",
      pincode: user.pincode || "",
    });
  }, [user]);

  /* ---------- Load room ---------- */
  useEffect(() => {
    if (!roomId) return;
    api.get(`/rooms/${roomId}`).then(({ data }) => setRoom(data));
  }, [roomId]);

  /* ---------- Disabled dates ---------- */
  useEffect(() => {
    if (!roomId) return;
    (async () => {
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
    })();
  }, [roomId]);

  /* ---------- Location helpers ---------- */
  const countries = getAllCountries();
  const states = addressInfo.country
    ? getStatesByCountry(addressInfo.country)
    : [];
  const cities =
    addressInfo.country && addressInfo.state
      ? getCitiesByState(addressInfo.country, addressInfo.state)
      : [];

  /* ---------- Nights ---------- */
  const nights = useMemo(() => {
    if (!range?.from || !range?.to) return 0;
    return Math.max(
      0,
      (toDateOnly(range.to) - toDateOnly(range.from)) /
        (1000 * 60 * 60 * 24)
    );
  }, [range]);

  /* ---------- Pricing ---------- */
  const roomTotal = useMemo(
    () => nights * Number(room?.pricePerNight || 0),
    [nights, room]
  );

  const mealTotal = useMemo(() => {
    if (!withMeal || !room) return 0;
    return (
      nights *
      (vegGuests * Number(room.mealPriceVeg || 0) +
        nonVegGuests * Number(room.mealPriceNonVeg || 0))
    );
  }, [withMeal, nights, vegGuests, nonVegGuests, room]);

  const total = roomTotal + mealTotal;

  /* ---------- Guests cap ---------- */
  const maxGuestsCap = useMemo(() => {
    if (!room) return 1;
    const nums = (room.accommodation || [])
      .flatMap((s) =>
        Array.from(String(s).matchAll(/\d+/g)).map((m) => Number(m[0]))
      )
      .filter(Boolean);
    return nums.length ? nums.reduce((a, b) => a + b, 0) : 1;
  }, [room]);

  /* ---------- Validation ---------- */
  const validateForm = () => {
    const e = {};
    if (form.email && !isValidEmail(form.email))
      e.email = "Invalid email format";

    if (Object.keys(e).length) {
      setErrors(e);
      Object.values(e).forEach((m) => toast.error(m));
      return false;
    }
    return true;
  };

  /* ---------- Payment ---------- */
  const proceedToPayment = async () => {
    if (!validateForm()) return;

    if (withMeal && vegGuests + nonVegGuests !== Number(guestsState)) {
      toast.error("Veg + Non-Veg must match total guests");
      return;
    }

    const ok = await loadRazorpayScript();
    if (!ok) throw new Error("Razorpay failed to load");

    const { data: order } = await api.post("/payments/create-order", {
      roomId: room._id,
      startDate: toYMD(range.from),
      endDate: toYMD(range.to),
      guests: Number(guestsState),
      withMeal,
      vegGuests,
      nonVegGuests,
      ...addressInfo,
      contactName: form.name,
      contactEmail: form.email || null,
      contactPhone: form.phone,
    });

    const rzp = new window.Razorpay({
      key: order.key,
      amount: order.amount,
      currency: "INR",
      name: room.name,
      order_id: order.orderId,
      theme: { color: "#BA081C" },
      handler: async (resp) => {
        await api.post("/payments/verify", {
          ...order,
          ...resp,
        });
        toast.success("Booking confirmed 🎉");
        navigate("/my-bookings", { replace: true });
      },
    });

    rzp.open();
  };

  if (!room) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-primary text-primary-foreground rounded-xl p-4">
        <div className="text-xl font-semibold">{room.name}</div>
        <div>₹{room.pricePerNight}/night</div>
      </div>

      <div className="rounded-xl border p-6 space-y-5">
        {/* PROFILE */}
        <div className="grid sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <Label>Name</Label>
            <Input value={form.name} disabled />
          </div>

          <div className="sm:col-span-2">
            <Label>Email</Label>
            <Input
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>

          <div className="sm:col-span-2">
            <Label>Date of Birth</Label>
            <Button variant="outline" disabled className="w-full justify-start">
              {form.dob ? format(form.dob, "PPP") : "-"}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </div>

          <div className="sm:col-span-2">
            <Label>Phone</Label>
            <Input value={form.phone} disabled />
          </div>
        </div>

        {/* ADDRESS */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            placeholder="Address"
            value={addressInfo.address}
            onChange={(e) =>
              setAddressInfo((f) => ({ ...f, address: e.target.value }))
            }
          />

          <Select
            value={addressInfo.country}
            onValueChange={(v) =>
              setAddressInfo((f) => ({ ...f, country: v, state: "", city: "" }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.isoCode} value={c.isoCode}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={addressInfo.state}
            onValueChange={(v) =>
              setAddressInfo((f) => ({ ...f, state: v, city: "" }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.isoCode} value={s.isoCode}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={addressInfo.city}
            onValueChange={(v) =>
              setAddressInfo((f) => ({ ...f, city: v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Pincode"
            value={addressInfo.pincode}
            onChange={(e) =>
              setAddressInfo((f) => ({
                ...f,
                pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
              }))
            }
          />
        </div>

        {/* GUESTS */}
        <Select value={guestsState} onValueChange={setGuestsState}>
          <SelectTrigger>
            <SelectValue placeholder="Guests" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: maxGuestsCap }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* MEALS */}
        <div className="flex items-center gap-3">
          <Checkbox checked={withMeal} onCheckedChange={setWithMeal} />
          <Label>Include meals</Label>
        </div>

        {withMeal && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              type="number"
              placeholder="Veg Guests"
              value={vegGuests}
              onChange={(e) => setVegGuests(Number(e.target.value))}
            />
            <Input
              type="number"
              placeholder="Non-Veg Guests"
              value={nonVegGuests}
              onChange={(e) => setNonVegGuests(Number(e.target.value))}
            />
          </div>
        )}

        <Separator />

        {/* TOTAL */}
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>₹{total.toLocaleString("en-IN")}</span>
        </div>

        <Button className="w-full" onClick={proceedToPayment}>
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}
