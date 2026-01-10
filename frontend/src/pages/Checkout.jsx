import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
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

  const roomId = state?.roomId;
  const guestsFromSearch = Number(state?.guests || 0);

  const [room, setRoom] = useState(null);
  const [withMeal, setWithMeal] = useState(false);

  /* ================= FORM ================= */
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    dob: user?.dob ? new Date(user.dob) : null,
  });

  const [address, setAddress] = useState({
    address: user?.address || "",
    country: user?.country || "",
    state: user?.state || "",
    city: user?.city || "",
    pincode: user?.pincode || "",
  });

  /* ================= GUESTS ================= */
  const [guests, setGuests] = useState(String(guestsFromSearch || ""));
  const [vegGuests, setVegGuests] = useState(0);
  const [nonVegGuests, setNonVegGuests] = useState(0);

  /* ================= DATE ================= */
  const [range, setRange] = useState({
    from: state?.startDate ? new Date(state.startDate) : null,
    to: state?.endDate ? new Date(state.endDate) : null,
  });

  /* ================= OTP ================= */
  const [otpStep, setOtpStep] = useState("idle");
  const [otp, setOtp] = useState("");
  const pendingProceed = useRef(false);

  /* ================= LOCATION ================= */
  const countries = getAllCountries();
  const states = address.country
    ? getStatesByCountry(address.country)
    : [];
  const cities =
    address.country && address.state
      ? getCitiesByState(address.country, address.state)
      : [];

  /* ================= LOAD ROOM ================= */
  useEffect(() => {
    if (!roomId) return navigate("/", { replace: true });
    api.get(`/rooms/${roomId}`).then(({ data }) => setRoom(data));
  }, [roomId, navigate]);

  /* ================= SYNC USER ================= */
  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name,
      email: user.email || "",
      phone: user.phone,
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
    return Math.max(
      0,
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

  /* ================= OTP FLOW ================= */
  const sendOtp = async () => {
    if (!isValidPhone(form.phone)) {
      toast.error("Enter valid phone number");
      return;
    }
    const verifier = getRecaptchaVerifier();
    const res = await signInWithPhoneNumber(
      auth,
      `+91${form.phone}`,
      verifier
    );
    window.confirmationResult = res;
    setOtpStep("sent");
    toast.success("OTP sent");
  };

  const verifyOtp = async () => {
    await window.confirmationResult.confirm(otp);
    await phoneLogin({
      phone: form.phone,
      name: form.name,
      email: form.email,
      dob: form.dob?.toISOString(),
    });
    await init();
    setOtpStep("verified");
    toast.success("Mobile verified");

    if (pendingProceed.current) {
      pendingProceed.current = false;
      proceedPayment();
    }
  };

  /* ================= PAYMENT ================= */
  const proceedPayment = async () => {
    if (withMeal && vegGuests + nonVegGuests !== Number(guests)) {
      return toast.error("Veg + Non-Veg must equal total guests");
    }

    await loadRazorpayScript();

    const { data } = await api.post("/payments/create-order", {
      roomId,
      startDate: toYMD(range.from),
      endDate: toYMD(range.to),
      guests: Number(guests),
      withMeal,
      vegGuests,
      nonVegGuests,
      ...address,
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
      handler: async (res) => {
        await api.post("/payments/verify", {
          ...res,
          roomId,
          startDate: toYMD(range.from),
          endDate: toYMD(range.to),
          guests,
          withMeal,
          vegGuests,
          nonVegGuests,
          ...address,
        });
        toast.success("Booking confirmed 🎉");
        navigate("/my-bookings");
      },
    });

    rzp.open();
  };

  const proceed = async () => {
    if (!user) {
      pendingProceed.current = true;
      if (otpStep === "idle") sendOtp();
      return toast.info("Verify mobile to continue");
    }
    proceedPayment();
  };

  if (!room) return null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div id="recaptcha-container" />

      {/* FORM */}
      <div className="border rounded-xl p-6 space-y-6">

        {/* BASIC */}
        <div className="grid grid-cols-2 gap-4">
          <Input value={form.name} disabled />
          <Input value={form.email} onChange={(e)=>setForm(f=>({...f,email:e.target.value}))}/>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                {form.dob ? format(form.dob,"PPP") : "Date of Birth"}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Calendar
                selected={form.dob}
                onSelect={(d)=>setForm(f=>({...f,dob:d}))}
              />
            </PopoverContent>
          </Popover>
          <Input value={form.phone} disabled />
        </div>

        {/* ADDRESS */}
        <Input placeholder="Address" value={address.address}
          onChange={(e)=>setAddress(a=>({...a,address:e.target.value}))}/>

        <div className="grid grid-cols-3 gap-4">
          <Select value={address.country} onValueChange={(v)=>setAddress(a=>({...a,country:v,state:"",city:""}))}>
            <SelectTrigger><SelectValue placeholder="Country"/></SelectTrigger>
            <SelectContent>{countries.map(c=><SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>)}</SelectContent>
          </Select>

          <Select value={address.state} onValueChange={(v)=>setAddress(a=>({...a,state:v,city:""}))}>
            <SelectTrigger><SelectValue placeholder="State"/></SelectTrigger>
            <SelectContent>{states.map(s=><SelectItem key={s.isoCode} value={s.isoCode}>{s.name}</SelectItem>)}</SelectContent>
          </Select>

          <Select value={address.city} onValueChange={(v)=>setAddress(a=>({...a,city:v}))}>
            <SelectTrigger><SelectValue placeholder="City"/></SelectTrigger>
            <SelectContent>{cities.map(c=><SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <Input placeholder="Pincode" value={address.pincode}
          onChange={(e)=>setAddress(a=>({...a,pincode:e.target.value.replace(/\D/g,"").slice(0,6)}))}/>

        {/* GUESTS */}
        <Select value={guests} onValueChange={(v)=>{setGuests(v);setVegGuests(0);setNonVegGuests(0);}}>
          <SelectTrigger><SelectValue placeholder="Guests"/></SelectTrigger>
          <SelectContent>
            {[...Array(10)].map((_,i)=><SelectItem key={i+1} value={String(i+1)}>{i+1}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* MEALS */}
        <div className="flex items-center gap-2">
          <Checkbox checked={withMeal} onCheckedChange={setWithMeal}/>
          <Label>Include meals</Label>
        </div>

        {withMeal && (
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" placeholder="Veg Guests" value={vegGuests}
              onChange={(e)=>setVegGuests(Number(e.target.value))}/>
            <Input type="number" placeholder="Non-Veg Guests" value={nonVegGuests}
              onChange={(e)=>setNonVegGuests(Number(e.target.value))}/>
          </div>
        )}

        <Separator/>

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
