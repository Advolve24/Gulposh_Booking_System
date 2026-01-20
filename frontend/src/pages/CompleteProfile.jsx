import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { api } from "../api/http";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Country, State, City } from "country-state-city";

export default function CompleteProfile() {
  const { user, init } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isGoogleLogin = user?.authProvider === "google";
const isPhoneLogin = user?.authProvider === "phone";


  const [loading, setLoading] = useState(false);

  /* ================= LOCATION STATE ================= */

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [countryCode, setCountryCode] = useState("IN");
  const [stateCode, setStateCode] = useState("");
  const [cityName, setCityName] = useState("");

  /* ================= FORM ================= */

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: null,

    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  /* 🚫 BLOCK IF ALREADY COMPLETE */
  useEffect(() => {
    if (user?.profileComplete) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  /* ================= LOAD COUNTRIES ================= */

  useEffect(() => {
    const all = Country.getAllCountries();
    setCountries(all);
  }, []);

  /* ================= PREFILL USER ================= */

  useEffect(() => {
    if (!user || !countries.length) return;

    const countryObj =
      countries.find((c) => c.name === user.country) ||
      countries.find((c) => c.isoCode === "IN");

    const countryISO = countryObj?.isoCode || "IN";

    const stateList = State.getStatesOfCountry(countryISO);
    const stateObj = stateList.find((s) => s.name === user.state);

    const stateISO = stateObj?.isoCode || "";

    const cityList = stateISO
      ? City.getCitiesOfState(countryISO, stateISO)
      : [];

    setCountryCode(countryISO);
    setStates(stateList);
    setStateCode(stateISO);
    setCities(cityList);
    setCityName(user.city || "");

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      dob: user.dob ? new Date(user.dob) : null,

      address: user.address || "",
      country: countryObj?.name || "",
      state: user.state || "",
      city: user.city || "",
      pincode: user.pincode || "",
    });
  }, [user, countries]);

  /* ================= HANDLERS ================= */

  const onCountryChange = (code) => {
    const country = countries.find((c) => c.isoCode === code);

    setCountryCode(code);
    setStateCode("");
    setCityName("");

    setStates(State.getStatesOfCountry(code));
    setCities([]);

    setForm((f) => ({
      ...f,
      country: country?.name || "",
      state: "",
      city: "",
    }));
  };

  const onStateChange = (code) => {
    const state = states.find((s) => s.isoCode === code);

    setStateCode(code);
    setCityName("");

    setCities(City.getCitiesOfState(countryCode, code));

    setForm((f) => ({
      ...f,
      state: state?.name || "",
      city: "",
    }));
  };

  const onCityChange = (name) => {
    setCityName(name);
    setForm((f) => ({ ...f, city: name }));
  };

  /* ================= SUBMIT ================= */

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Full name is required");
      return;
    }

    if (!form.dob) {
      toast.error("Date of birth is required");
      return;
    }

    if (isGoogleLogin && form.phone.length !== 10) {
      toast.error("Valid mobile number is required");
      return;
    }

    try {
      setLoading(true);

      await api.put("/auth/me", {
        name: form.name.trim(),
        email: form.email || null,
        phone: isGoogleLogin ? form.phone : null,
        dob: form.dob.toISOString(),

        address: form.address || null,
        country: form.country || null,
        state: form.state || null,
        city: form.city || null,
        pincode: form.pincode || null,
      });

      await init();

      toast.success("Profile completed successfully 🎉");

      navigate(location.state?.redirectTo || "/", {
        replace: true,
        state: location.state?.bookingState,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white border rounded-2xl p-6 space-y-6">

        <div>
          <h2 className="text-2xl font-semibold">Complete Your Profile</h2>
          <p className="text-sm text-muted-foreground">
            Kindly complete your profile to ensure a seamless booking and billing experience.
          </p>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <Label>Full Name</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              disabled={isGoogleLogin}
              className={isGoogleLogin ? "bg-muted cursor-not-allowed" : ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />

            {isGoogleLogin && (
              <p className="text-xs text-muted-foreground">
                This verified email is linked to your Google account and will be used for booking communication.
              </p>
            )}

            {isPhoneLogin && (
              <p className="text-xs text-muted-foreground">
                Add an email to receive booking confirmations and invoices.
              </p>
            )}
          </div>


          <div className="space-y-1">
            <Label>Mobile Number</Label>
            <Input
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              disabled={isPhoneLogin}
              className={isPhoneLogin ? "bg-muted cursor-not-allowed" : ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  phone: e.target.value.replace(/\D/g, ""),
                }))
              }
            />

            {isPhoneLogin && (
              <p className="text-xs text-muted-foreground">
                This mobile number is verified via OTP and cannot be changed.
              </p>
            )}

            {isGoogleLogin && (
              <p className="text-xs text-muted-foreground">
                Please add a mobile number for contact during your stay.
              </p>
            )}
          </div>

          {/* DOB */}
          <div className="sm:col-span-2">
            <Label>Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {form.dob
                    ? format(form.dob, "dd MMM yyyy")
                    : "Select date of birth"}
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  fromYear={1950}
                  toYear={new Date().getFullYear()}
                  selected={form.dob}
                  onSelect={(d) =>
                    setForm((f) => ({ ...f, dob: d }))
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* ADDRESS */}
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>

          <div>
            <Label>Country</Label>
            <Select value={countryCode} onValueChange={onCountryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
              value={stateCode}
              disabled={!states.length}
              onValueChange={onStateChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
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
              value={cityName}
              disabled={!cities.length}
              onValueChange={onCityChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c, i) => (
                  <SelectItem key={i} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Pincode</Label>
            <Input
              inputMode="numeric"
              maxLength={6}
              value={form.pincode}
              onChange={(e) =>
                setForm((f) => ({ ...f, pincode: e.target.value }))
              }
            />
          </div>
        </div>

        <Button
          className="w-full text-lg rounded-xl"
          disabled={loading}
          onClick={submit}
        >
          {loading ? "Saving..." : "Save & Continue"}
        </Button>
      </div>
    </div>
  );
}
