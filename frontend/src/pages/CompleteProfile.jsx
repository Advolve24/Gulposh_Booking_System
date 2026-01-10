import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const [loading, setLoading] = useState(false);

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    dob: null,
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  /* 🚫 If profile already complete, block page */
  useEffect(() => {
    if (user?.profileComplete) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  /* 🌍 Load countries */
  useEffect(() => {
    setCountries(getAllCountries());
  }, []);

  useEffect(() => {
    if (form.country) {
      setStates(getStatesByCountry(form.country));
    } else {
      setStates([]);
    }
    setCities([]);
  }, [form.country]);

  useEffect(() => {
    if (form.state && form.country) {
      setCities(getCitiesByState(form.country, form.state));
    } else {
      setCities([]);
    }
  }, [form.state, form.country]);

  /* ✅ Submit profile */
  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!form.dob) {
      toast.error("Date of birth is required");
      return;
    }

    try {
      setLoading(true);

      await api.put("/auth/me", {
        name: form.name.trim(),
        email: form.email || null,
        dob: form.dob.toISOString(),
        address: form.address || null,
        country: form.country || null,
        state: form.state || null,
        city: form.city || null,
        pincode: form.pincode || null,
      });

      await init(); // refresh auth user
      toast.success("Profile completed successfully 🎉");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to save profile"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="rounded-xl border p-5 space-y-5 bg-white">
        <div>
          <h2 className="text-xl font-semibold">Complete your profile</h2>
          <p className="text-sm text-muted-foreground">
            This information will be used for checkout and invoices.
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

          <div className="sm:col-span-2">
            <Label>Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {form.dob ? format(form.dob, "PPP") : "Select date"}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.dob}
                  onSelect={(d) => setForm((f) => ({ ...f, dob: d }))}
                  fromYear={1950}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
          </div>

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
              onValueChange={(v) =>
                setForm((f) => ({ ...f, state: v, city: "" }))
              }
              disabled={!form.country}
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
              onValueChange={(v) =>
                setForm((f) => ({ ...f, city: v }))
              }
              disabled={!form.state}
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

        <Button className="w-full" onClick={submit} disabled={loading}>
          {loading ? "Saving..." : "Save & Continue"}
        </Button>
      </div>
    </div>
  );
}
