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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import {
  getAllCountries,
  getStatesByCountry,
  getCitiesByState,
} from "../lib/location";

export default function CompleteProfile() {
  const { user, init } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const isGoogleLogin = user?.authProvider === "google";

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

  /* 🔒 BLOCK IF ALREADY COMPLETE */
  useEffect(() => {
    if (user?.profileComplete) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  /* 🔁 PREFILL */
  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      dob: user.dob ? new Date(user.dob) : null,
      address: user.address || "",
      country: user.country || "",
      state: user.state || "",
      city: user.city || "",
      pincode: user.pincode || "",
    });
  }, [user]);

  /* 🌍 LOCATION */
  useEffect(() => {
    setCountries(getAllCountries());
  }, []);

  useEffect(() => {
    setStates(form.country ? getStatesByCountry(form.country) : []);
    setCities([]);
  }, [form.country]);

  useEffect(() => {
    setCities(
      form.country && form.state
        ? getCitiesByState(form.country, form.state)
        : []
    );
  }, [form.country, form.state]);

  /* ✅ SUBMIT */
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

      const countryObj = countries.find(c => c.isoCode === form.country);
      const stateObj = states.find(s => s.isoCode === form.state);

      await api.put("/auth/me", {
        name: form.name.trim(),
        email: form.email || null,
        phone: isGoogleLogin ? form.phone : null,
        dob: form.dob.toISOString(),
        address: form.address || null,
        country: countryObj?.name || null,
        state: stateObj?.name || null,
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
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <div className="rounded-2xl border bg-white p-6 sm:p-8 space-y-6">

        {/* HEADER */}
        <div>
          <h2 className="text-2xl font-semibold">Complete your profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This information is required for bookings and invoices.
          </p>
        </div>

        {/* FORM */}
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

          <div>
            <Label>Email (optional)</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>

          {isGoogleLogin && (
            <div>
              <Label>Mobile Number</Label>
              <Input
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
              />
            </div>
          )}

          {/* DOB */}
          <div className="sm:col-span-2">
            <Label>Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                >
                  {form.dob
                    ? format(form.dob, "dd MMM yyyy")
                    : "Select date of birth"}
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.dob}
                  onSelect={(d) => d && setForm((f) => ({ ...f, dob: d }))}
                  captionLayout="dropdown"   // ✅ month + year dropdown
                  fromYear={1950}
                  toYear={new Date().getFullYear()}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* LOCATION */}
          <div>
            <Label>Country</Label>
            <Select
              value={form.country}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, country: v, state: "", city: "" }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
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
              value={form.state}
              disabled={!form.country}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, state: v, city: "" }))
              }
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
              value={form.city}
              disabled={!form.state}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, city: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
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
              value={form.pincode}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                }))
              }
            />
          </div>

          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>
        </div>

        <Button
          className="w-full rounded-xl"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save & Continue"}
        </Button>
      </div>
    </div>
  );
}
