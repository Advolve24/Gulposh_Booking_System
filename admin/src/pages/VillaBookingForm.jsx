import { useEffect, useState } from "react";
import { api } from "../api/http";
import { listBookingsAdmin, listBlackouts } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { loadRazorpayScript } from "../lib/loadRazorpay";
import { toDateOnlyUTC, todayDateOnlyUTC, toDateOnlyFromAPIUTC } from "../lib/date";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Country, State, City } from "country-state-city";

const toDateKey = (date) => format(date, "yyyy-MM-dd");

export default function VillaBookingForm() {
  const navigate = useNavigate();
  const [range, setRange] = useState();
  const [disabled, setDisabled] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookedDates, setBookedDates] = useState(new Set());
  const [blockedRanges, setBlockedRanges] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [countryCode, setCountryCode] = useState("IN");
  const [stateCode, setStateCode] = useState("");
  const [cityName, setCityName] = useState("");
  const [userId, setUserId] = useState(null);
  const [userChecked, setUserChecked] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const totalGuests = adults + children;
  const [vegGuests, setVegGuests] = useState(0);
  const [nonVegGuests, setNonVegGuests] = useState(0);

  const isBooked = (date) => bookedDates.has(toDateKey(date));

  const isBlocked = (date) => {
    const key = toDateKey(date);
    return blockedRanges.some(
      (b) => key >= b.fromKey && key <= b.toKey
    );
  };

  const isRangeValid = (from, to) => {
    let d = toDateKey(from);
    const end = toDateKey(to);

    while (d <= end) {
      if (bookedDates.has(d)) return false;
      if (
        blockedRanges.some(
          (b) => d >= b.fromKey && d <= b.toKey
        )
      ) {
        return false;
      }
      d = toDateKey(addDays(new Date(d), 1));
    }
    return true;
  };


  const onCountryChange = (code) => {
    const country = countries.find((c) => c.isoCode === code);
    setCountryCode(code);
    setStateCode("");
    setCityName("");
    setForm((f) => ({
      ...f,
      country: country?.name || "",
      state: "",
      city: "",
    }));
    setStates(State.getStatesOfCountry(code));
    setCities([]);
  };

  const onStateChange = (code) => {
    const state = states.find((s) => s.isoCode === code);
    setStateCode(code);
    setCityName("");
    setForm((f) => ({
      ...f,
      state: state?.name || "",
      city: "",
    }));
    setCities(City.getCitiesOfState(countryCode, code));
  };

  const onCityChange = (name) => {
    setCityName(name);
    setForm((f) => ({ ...f, city: name }));
  };


  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: null,

    address: "",
    country: "India",
    state: "",
    city: "",
    pincode: "",

    guests: 1,
    customAmount: "",
    govIdType: "",
    govIdNumber: "",
    paymentMode: "Online",
  });

  useEffect(() => {
    (async () => {
      try {
        const [bookings, blackouts] = await Promise.all([
          listBookingsAdmin({ limit: 500 }),
          listBlackouts(),
        ]);

        const bookedSet = new Set();

        (bookings || []).forEach((b) => {
          let d = toDateKey(new Date(b.startDate));
          const end = toDateKey(new Date(b.endDate));

          while (d <= end) {
            bookedSet.add(d);
            d = toDateKey(addDays(new Date(d), 1));
          }
        });

        setBookedDates(bookedSet);

        setBlockedRanges(
          (blackouts || []).map((b) => ({
            fromKey: toDateKey(new Date(b.from)),
            toKey: toDateKey(new Date(b.to)),
          }))
        );
      } catch (err) {
        console.error("Availability load failed:", err);
        toast.error("Failed to load availability");
      }
    })();
  }, []);

  useEffect(() => {
    const all = Country.getAllCountries();
    setCountries(all);
  }, []);

  useEffect(() => {
    if (!countries.length) return;
    onCountryChange(countryCode);
  }, [countries]);


  const checkUserByPhone = async () => {
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      toast.error("Enter valid 10-digit phone number");
      return;
    }

    try {
      const { data } = await api.get(
        `/admin/users/check-phone/${form.phone}`
      );

      setUserChecked(true);

      if (!data.exists) {
        setUserId(null);
        toast.info("User not found. Please enter details.");
        return;
      }

      const u = data.user;
      setUserId(u.id);

      /* ===== COUNTRY ===== */
      const allCountries = Country.getAllCountries();
      const countryObj =
        allCountries.find(
          (c) =>
            c.name === u.country ||
            c.isoCode === u.country
        ) || allCountries.find((c) => c.isoCode === "IN");

      const countryISO = countryObj.isoCode;

      /* ===== STATES ===== */
      const stateList = State.getStatesOfCountry(countryISO);
      const stateObj = stateList.find(
        (s) =>
          s.name === u.state ||
          s.isoCode === u.state
      );

      const stateISO = stateObj?.isoCode || "";

      /* ===== CITIES ===== */
      const cityList = stateISO
        ? City.getCitiesOfState(countryISO, stateISO)
        : [];

      /* ===== SET UI STATE (Selects) ===== */
      setCountryCode(countryISO);
      setStateCode(stateISO);
      setCityName(u.city || "");

      setStates(stateList);
      setCities(cityList);

      /* ===== SET FORM DATA (DB VALUES) ===== */
      setForm((f) => ({
        ...f,
        name: u.name || "",
        email: u.email || "",
        dob: u.dob ? new Date(u.dob) : null,

        address: u.address || "",
        country: countryObj.name,
        state: u.state || "",
        city: u.city || "",
        pincode: u.pincode || "",
      }));

      toast.success("User found! Details auto-filled.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to check user");
    }
  };


  const ensureUserExists = async () => {
    if (userId) return userId;

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      dob: form.dob
        ? form.dob.toISOString().split("T")[0]
        : null,
    };
    const { data } = await api.post("/admin/users", payload);
    setUserId(data._id);
    return data._id;
  };


  /* ================= VALIDATION ================= */
  const validateForm = () => {
    if (!userChecked) throw new Error("Please check mobile number first");
    if (!form.name || form.name.length < 3)
      throw new Error("Enter valid name");
    if (!form.phone) throw new Error("Phone is required");
    if (!form.customAmount || form.customAmount <= 0)
      throw new Error("Enter valid amount");
    if (!range?.from || !range?.to)
      throw new Error("Select booking dates");
    if (vegGuests + nonVegGuests !== totalGuests) {
      throw new Error("Veg + Non-Veg guests must equal total guests");
    }
  };

  /* ================= SUBMIT ================= */
  const submit = async () => {
    try {
      setLoading(true);
      validateForm();

      const uid = await ensureUserExists();

      const start = toDateOnlyUTC(range.from);
      const end = toDateOnlyUTC(range.to);

      /* ===== CASH BOOKING ===== */
      if (form.paymentMode === "Cash") {
        await api.post("/admin/villa-verify", {
          userId: uid,
          startDate: start,
          endDate: end,
          guests: totalGuests,
          adults,
          children,
          vegGuests,
          nonVegGuests,
          customAmount: form.customAmount,

          contactName: form.name,
          contactEmail: form.email,
          contactPhone: form.phone,

          addressInfo: {
            address: form.address,
            country: form.country,
            state: form.state,
            city: form.city,
            pincode: form.pincode,
          },

          govIdType: form.govIdType,
          govIdNumber: form.govIdNumber,
          paymentMode: "Cash",
        });

        toast.success("Booking confirmed (Cash)");
        return navigate("/dashboard");
      }

      /* ===== ONLINE BOOKING ===== */
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Razorpay failed to load");

      const { data: order } = await api.post("/admin/villa-order", {
        userId: uid,
        startDate: start,
        endDate: end,
        guests: totalGuests,
        adults,
        children,
        vegGuests,
        nonVegGuests,
        customAmount: Number(form.customAmount),
        contactName: form.name,
        contactEmail: form.email,
        contactPhone: form.phone,
      });


      const rzp = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: "Villa Gulposh",
        order_id: order.orderId,
        handler: async (resp) => {
          await api.post("/admin/villa-verify", {
            userId: uid,
            startDate: start,
            endDate: end,
            guests: totalGuests,
            adults,
            children,
            vegGuests,
            nonVegGuests,
            customAmount: Number(form.customAmount),
            contactName: form.name,
            contactEmail: form.email,
            contactPhone: form.phone,
            govIdType: form.govIdType,
            govIdNumber: form.govIdNumber,
            paymentMode: "Online",
            addressInfo: {
              address: form.address,
              country: form.country,
              state: form.state,
              city: form.city,
              pincode: form.pincode,
            },
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });

          toast.success("Booking confirmed successfully!");
          navigate("/dashboard");
        },
      });
      rzp.open();
    } catch (err) {
      toast.error(err.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };



  return (
    <AppLayout>
      <div className="w-full md:max-w-6xl mb-4">
        <div className="flex flex-col md:flex-row gap-5 relative">

          {/* ================= CALENDAR ================= */}
          <div className="w-full md:w-[44%] md:sticky md:top-24 self-start">
            <Label className="mb-4 block text-gray-600">Select Booking Dates</Label>
            <Calendar
              mode="range"
              numberOfMonths={1}
              fromDate={todayDateOnlyUTC()}
              selected={range}
              onSelect={(r) => {
                if (!r?.from) {
                  setRange(undefined);
                  return;
                }

                if (r.to && !isRangeValid(r.from, r.to)) {
                  toast.error("Selected range includes booked or blocked dates");
                  return;
                }

                setRange(r);
              }}
              disabled={(date) =>
                date < todayDateOnlyUTC() ||
                isBooked(date) ||
                isBlocked(date)
              }
              className="border bg-white rounded-xl shadow-sm w-full"
            />

            {/* Selected dates summary */}
            <div className="mt-4 p-3 bg-white border rounded-lg text-sm">
              <strong>Selected Dates:</strong>{" "}
              {range?.from && range?.to
                ? `${format(range.from, "dd MMM yyyy")} → ${format(range.to, "dd MMM yyyy")}`
                : "Not selected"}
            </div>
          </div>

          {/* ================= FORM ================= */}
          <div className="space-y-6 w-full md:w-[55%] bg-white shadow-md rounded-2xl p-4 md:p-4">

            {/* ================= SECTION 1: MOBILE ================= */}
            <div className="border rounded-xl p-4 bg-[#faf8f4] space-y-1">
              <h3 className="font-semibold text-gray-800">1. Mobile Verification</h3>

              <Label className="font-[400]">Mobile Number</Label>
              <div className="flex gap-2">
                <Input
                  className="mt-1 rounded-[8px] h-10"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
                <Button type="button" className="h-10 mt-1" onClick={checkUserByPhone} variant="secondary">
                  Check
                </Button>
              </div>

              {userChecked && userId && (
                <p className="text-sm text-green-600 font-medium">
                  ✔ User found. Details auto-filled.
                </p>
              )}

              {userChecked && !userId && (
                <p className="text-sm text-orange-600 font-medium">
                  ⚠ User not found. Please enter details.
                </p>
              )}
            </div>

            {/* ================= SECTION 2: USER DETAILS ================= */}
            <div className="border rounded-xl p-4 space-y-4">
              <h3 className="font-semibold text-gray-800">2. User Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-[400]">Full Name</Label>
                  <Input
                    className="h-10 rounded-[8px] mt-1"
                    placeholder="Enter User's Full Name"
                    disabled={!!userId}
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label className="font-[400]">Email</Label>
                  <Input
                    className="h-10 rounded-[8px] mt-1"
                    placeholder="Enter User's Email ID"
                    disabled={!!userId}
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="font-[400]">Date of Birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!!userId}
                        className="justify-between w-full mt-1 h-10"
                      >
                        {form.dob ? format(form.dob, "dd MMM yyyy") : "Select DOB"}
                        <CalendarIcon className="h-4 w-4 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown"
                        selected={form.dob}
                        onSelect={(d) =>
                          setForm((f) => ({ ...f, dob: d }))
                        }
                        fromYear={1950}
                        toYear={new Date().getFullYear()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* ================= SECTION 3: ADDRESS ================= */}
            <div className="border rounded-xl p-4 space-y-4">
              <h3 className="font-semibold text-gray-800">3. Address Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="font-[400]">Street Address</Label>
                  <Input
                    className="mt-1 h-10 rounded-[8px]"
                    placeholder="Enter User's Street Address"
                    value={form.address}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label className="font-[400]">Country</Label>
                  <Select
                    value={countryCode}
                    onValueChange={(code) => {
                      setCountryCode(code);
                      onCountryChange(code);
                    }}
                  >
                    <SelectTrigger className="mt-1 h-10">
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-64">
                      {countries.map((c) => (
                        <SelectItem key={c.isoCode} value={c.isoCode}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="font-[400]">State</Label>
                  <Select
                    value={stateCode}
                    onValueChange={(code) => {
                      setStateCode(code);
                      onStateChange(code);
                    }}
                    disabled={!states.length}
                  >
                    <SelectTrigger className="mt-1 h-10">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-64">
                      {states.map((s) => (
                        <SelectItem key={s.isoCode} value={s.isoCode}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="font-[400]">City</Label>
                  <Select
                    value={cityName}
                    onValueChange={(name) => {
                      setCityName(name);
                      onCityChange(name);
                    }}
                    disabled={!cities.length}
                  >
                    <SelectTrigger className="mt-1 h-10">
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-64">
                      {cities.map((c, i) => (
                        <SelectItem key={i} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="font-[400]">Pincode</Label>
                  <Input
                    className="h-10 mt-1 rounded-[8px]"
                    placeholder="Pincode"
                    maxLength={6}
                    value={form.pincode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pincode: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>


            <div className="border rounded-xl p-4 space-y-4">
              <h3 className="font-semibold text-gray-800">4. Booking Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ===== GUEST COUNT ===== */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">

                  {/* ADULTS */}
                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">Adults</p>
                      <p className="text-xs text-muted-foreground">Ages 13+</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={adults <= 1}
                        onClick={() => setAdults((a) => Math.max(1, a - 1))}
                      >−</Button>
                      <span className="w-6 text-center">{adults}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setAdults((a) => a + 1)}
                      >+</Button>
                    </div>
                  </div>

                  {/* CHILDREN */}
                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">Children</p>
                      <p className="text-xs text-muted-foreground">Ages 2–12</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={children <= 0}
                        onClick={() => setChildren((c) => Math.max(0, c - 1))}
                      >−</Button>
                      <span className="w-6 text-center">{children}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setChildren((c) => c + 1)}
                      >+</Button>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Total Guests: <b>{totalGuests}</b>
                  </p>

                </div>


                {/* ===== MEAL PREFERENCE ===== */}
                <div className="md:col-span-2">

                  <Label className="font-[400]">Meal Preference</Label>

                  <div className="grid md:grid-cols-2 gap-4 mt-2">

                    {/* ===== VEG ===== */}
                    <div className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-medium">Veg</p>
                        <p className="text-xs text-muted-foreground">
                          Vegetarian meals
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={vegGuests === 0}
                          onClick={() =>
                            setVegGuests((v) => Math.max(0, v - 1))
                          }
                        >
                          −
                        </Button>

                        <span className="w-6 text-center font-medium">
                          {vegGuests}
                        </span>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={vegGuests + nonVegGuests >= totalGuests}
                          onClick={() =>
                            setVegGuests((v) =>
                              Math.min(totalGuests - nonVegGuests, v + 1)
                            )
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* ===== NON-VEG ===== */}
                    <div className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-medium">Non-Veg</p>
                        <p className="text-xs text-muted-foreground">
                          Non-vegetarian meals
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={nonVegGuests === 0}
                          onClick={() =>
                            setNonVegGuests((v) => Math.max(0, v - 1))
                          }
                        >
                          −
                        </Button>

                        <span className="w-6 text-center font-medium">
                          {nonVegGuests}
                        </span>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={vegGuests + nonVegGuests >= totalGuests}
                          onClick={() =>
                            setNonVegGuests((v) =>
                              Math.min(totalGuests - vegGuests, v + 1)
                            )
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>

                  </div>

                  <p
                    className={`text-xs font-medium mt-2 ${vegGuests + nonVegGuests === totalGuests
                      ? "text-green-600"
                      : "text-red-600"
                      }`}
                  >
                    Selected: {vegGuests + nonVegGuests} / {totalGuests}
                    {vegGuests + nonVegGuests !== totalGuests &&
                      " (Veg + Non-Veg must equal total guests)"}
                  </p>

                </div>

                <div>
                  <Label className="font-[400]">Custom Amount (₹)</Label>
                  <Input
                    className="h-10 mt-1 rounded-[8px]"
                    type="number"
                    min="0"
                    value={form.customAmount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, customAmount: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label className="font-[400]">Government ID Type</Label>
                  <Select
                    value={form.govIdType}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, govIdType: v }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-10">
                      <SelectValue placeholder="Select ID Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                      <SelectItem value="Passport">Passport</SelectItem>
                      <SelectItem value="Voter ID">Voter ID</SelectItem>
                      <SelectItem value="Driving License">Driving License</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="font-[400]">Government ID Number</Label>
                  <Input
                    className="mt-1 h-10"
                    value={form.govIdNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, govIdNumber: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label className="font-[400]">Payment Mode</Label>
                  <Select
                    value={form.paymentMode}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, paymentMode: v }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ================= SUBMIT ================= */}
            <Button
              onClick={submit}
              disabled={loading || !userChecked}
              className="w-full text-lg py-5 font-semibold rounded-xl"
            >
              {loading ? "Processing..." : "Proceed to Confirm Booking"}
            </Button>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}