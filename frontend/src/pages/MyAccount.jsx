import { useEffect, useState } from "react";
import { api } from "../api/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
} from "lucide-react";

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

import {
  getAllCountries,
  getStatesByCountry,
  getCitiesByState,
} from "../lib/location";

export default function MyAccount() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");

        setForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          dob: data.dob ? new Date(data.dob) : null,
          address: data.address || "",
          country: data.country || "",
          state: data.state || "",
          city: data.city || "",
          pincode: data.pincode || "",
        });
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ================= LOCATION HELPERS ================= */
  const countries = getAllCountries();
  const states = form.country
    ? getStatesByCountry(form.country)
    : [];
  const cities =
    form.country && form.state
      ? getCitiesByState(form.country, form.state)
      : [];

  /* ================= SAVE PROFILE ================= */
  const onSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.dob) {
      toast.error("Date of birth is required");
      return;
    }

    try {
      setSaving(true);

      await api.put("/auth/me", {
        name: form.name,
        email: form.email || null,
        dob: form.dob.toISOString(),
        address: form.address || null,
        country: form.country || null,
        state: form.state || null,
        city: form.city || null,
        pincode: form.pincode || null,
      });

      toast.success("Profile updated successfully");
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  const initials =
    form.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

      {/* HEADER */}
      <div className="text-center">
        <h1 className="text-3xl font-serif font-semibold">
          My Account
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal information
        </p>
      </div>

      {/* PROFILE CARD */}
      <Card className="rounded-2xl border bg-white p-6 sm:p-8 space-y-6">

        {/* HEADER ROW */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-semibold">
            Profile Information
          </h2>

          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* AVATAR */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold">
            {initials}
          </div>

          <div>
            <div className="text-lg font-semibold">
              {form.name || "Your Name"}
            </div>
            <div className="text-sm text-muted-foreground">
              {form.email || "—"}
            </div>
          </div>
        </div>

        <div className="border-t" />

        {/* FORM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* NAME */}
          <div>
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Full Name
            </Label>
            <Input
              className="mt-2"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </div>

          {/* EMAIL */}
          <div>
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input
              className="mt-2"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>

          {/* DOB */}
          <div>
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Date of Birth
            </Label>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="mt-2 w-full justify-start"
                >
                  {form.dob ? format(form.dob, "PPP") : "Select date"}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.dob}
                  onSelect={(d) =>
                    setForm((f) => ({ ...f, dob: d }))
                  }
                  fromYear={1950}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* PHONE (LOCKED) */}
          <div>
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </Label>
            <Input
              className="mt-2 bg-muted cursor-not-allowed"
              value={form.phone}
              disabled
            />
          </div>

          {/* ADDRESS */}
          <div className="sm:col-span-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address
            </Label>
            <Input
              className="mt-2"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>

          {/* COUNTRY */}
          <Select
            value={form.country}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                country: v,
                state: "",
                city: "",
              }))
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

          {/* STATE */}
          <Select
            value={form.state}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, state: v, city: "" }))
            }
            disabled={!form.country}
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

          {/* CITY */}
          <Select
            value={form.city}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, city: v }))
            }
            disabled={!form.state}
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

          {/* PINCODE */}
          <div>
            <Label>Pincode</Label>
            <Input
              className="mt-2"
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
        </div>
      </Card>
    </div>
  );
}
