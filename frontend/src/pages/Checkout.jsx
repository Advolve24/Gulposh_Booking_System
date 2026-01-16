import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../store/authStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CalendarIcon } from "lucide-react";

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

/* ================= HELPERS ================= */
const toYMD = (d) => (d ? format(new Date(d), "yyyy-MM-dd") : null);
const toDateOnly = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const roomId = state?.roomId;
  const initialGuests = Number(state?.guests || 1);

  const [room, setRoom] = useState(null);

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

  const [guests, setGuests] = useState(String(initialGuests));
  const [withMeal, setWithMeal] = useState(false);

  // ✅ EMPTY by default (NO ZERO)
  const [vegGuests, setVegGuests] = useState("");
  const [nonVegGuests, setNonVegGuests] = useState("");

  const [range, setRange] = useState({
    from: state?.startDate ? new Date(state.startDate) : null,
    to: state?.endDate ? new Date(state.endDate) : null,
  });

  const countries = getAllCountries();
  const statesList = address.country
    ? getStatesByCountry(address.country)
    : [];
  const citiesList =
    address.country && address.state
      ? getCitiesByState(address.country, address.state)
      : [];

  useEffect(() => {
    if (!roomId) return navigate("/", { replace: true });
    api.get(`/rooms/${roomId}`).then(({ data }) => setRoom(data));
  }, [roomId, navigate]);

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
  }, [user]);

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
      ((Number(vegGuests || 0) * room.mealPriceVeg) +
        (Number(nonVegGuests || 0) * room.mealPriceNonVeg))
      : 0;

  const vegCount = Number(vegGuests || 0);
  const nonVegCount = Number(nonVegGuests || 0);

  const mealGuestMismatch =
    withMeal && vegCount + nonVegCount !== Number(guests);


  const total = roomTotal + mealTotal;

  const proceedPayment = async () => {
    if (
      withMeal &&
      Number(vegGuests || 0) + Number(nonVegGuests || 0) !== Number(guests)
    ) {
      toast.error("Veg + Non-Veg guests must equal total guests");
      return;
    }

    const ok = await loadRazorpayScript();
    if (!ok) return toast.error("Payment gateway failed");

    const { data } = await api.post("/payments/create-order", {
      roomId,
      startDate: toYMD(range.from),
      endDate: toYMD(range.to),
      guests: Number(guests),
      withMeal,
      vegGuests: Number(vegGuests || 0),
      nonVegGuests: Number(nonVegGuests || 0),
      contactName: form.name,
      contactEmail: form.email,
      contactPhone: form.phone,
    });

    const rzp = new window.Razorpay({
      key: data.key,
      amount: data.amount,
      currency: "INR",
      name: room.name,
      order_id: data.orderId,
      handler: () => navigate("/my-bookings"),
      theme: { color: "#BA081C" },
    });

    rzp.open();
  };

  if (!room) return null;

  // ✅ SAFE IMAGE (NO PLACEHOLDER)
  const roomImage =
    room?.images?.length > 0
      ? room.images[0]
      : room?.image || room?.coverImage || null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* LEFT – IMAGE + NAME ONLY */}
        <div className="lg:col-span-3">
          <div className="sticky top-20 bg-white rounded-xl border overflow-hidden">
            {roomImage && (
              <img
                src={roomImage}
                alt={room.name}
                className="h-64 w-full object-cover"
              />
            )}
            <div className="p-4">
              <h3 className="text-lg font-semibold">{room.name}</h3>
            </div>
          </div>
        </div>

        {/* RIGHT – FULL FORM */}
        <div className="lg:col-span-7 bg-white rounded-xl p-4 sm:p-6 space-y-6">

          {/* PROFILE */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={form.name} disabled />
            </div>

            <div className="col-span-2">
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
                  <Button variant="outline" className="w-full justify-between">
                    {form.dob
                      ? format(form.dob, "dd MMM yyyy")
                      : "Select date"}
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-3">
              <Label>Address</Label>
              <Input
                value={address.address}
                onChange={(e) =>
                  setAddress((a) => ({ ...a, address: e.target.value }))
                }
              />
            </div>

            <SelectField
              label="Country"
              value={address.country}
              onChange={(v) =>
                setAddress((a) => ({ ...a, country: v, state: "", city: "" }))
              }
              options={countries.map((c) => ({
                value: c.isoCode,
                label: c.name,
              }))}
            />

            <SelectField
              label="State"
              value={address.state}
              onChange={(v) =>
                setAddress((a) => ({ ...a, state: v, city: "" }))
              }
              options={statesList.map((s) => ({
                value: s.isoCode,
                label: s.name,
              }))}
            />

            <SelectField
              label="City"
              value={address.city}
              onChange={(v) =>
                setAddress((a) => ({ ...a, city: v }))
              }
              options={citiesList.map((c) => ({
                value: c.name,
                label: c.name,
              }))}
            />

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

          {/* DATES */}
          <div>
            <Label>Check-in & Check-out</Label>
            <CalendarRange value={range} onChange={setRange} />
          </div>

          {/* GUESTS */}
          <div>
            <Label>Guests</Label>
            <Select value={guests} onValueChange={setGuests}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* MEALS */}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox checked={withMeal} onCheckedChange={setWithMeal} />
              <Label>Include meals</Label>
            </div>

            {withMeal && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  min={0}
                  max={Number(guests) - nonVegCount}
                  placeholder="Veg guests"
                  value={vegGuests}
                  onChange={(e) => {
                    const val = Math.min(
                      Number(e.target.value || 0),
                      Number(guests) - nonVegCount
                    );
                    setVegGuests(val === 0 ? "" : String(val));
                  }}
                />

                <Input
                  type="number"
                  min={0}
                  max={Number(guests) - vegCount}
                  placeholder="Non-veg guests"
                  value={nonVegGuests}
                  onChange={(e) => {
                    const val = Math.min(
                      Number(e.target.value || 0),
                      Number(guests) - vegCount
                    );
                    setNonVegGuests(val === 0 ? "" : String(val));
                  }}
                />
              </div>
            )}
            {withMeal && mealGuestMismatch && (
  <p className="text-sm text-red-600">
    Veg + Non-Veg guests must equal total guests ({guests})
  </p>
)}


          </div>

          <Separator />

          {/* PRICE */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Room ({nights} nights)</span>
              <span>₹{roomTotal.toLocaleString("en-IN")}</span>
            </div>
            {withMeal && (
              <div className="flex justify-between">
                <span>Meals</span>
                <span>₹{mealTotal.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <Button className="w-full h-12 bg-red-700" onClick={proceedPayment} disabled={withMeal && mealGuestMismatch}>
            Proceed to Payment
          </Button>
        </div>
      </div>
    </div>
  );
}

/* SIMPLE SELECT HELPER */
function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
