import { useEffect, useState } from "react";
import { api } from "../api/http";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
  ShieldCheck,
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

import {
  getAllCountries,
  getStatesByCountry,
  getCitiesByState,
} from "../lib/location";

import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRecaptchaVerifier } from "@/lib/recaptcha";

export default function MyAccount() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

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

  const [phone, setPhone] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");

  const [otpStep, setOtpStep] = useState("idle"); // idle | sent | verified
  const [otp, setOtp] = useState("");

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");

        setForm({
          name: data.name || "",
          email: data.email || "",
          dob: data.dob ? new Date(data.dob) : null,
          address: data.address || "",
          country: data.country || "",
          state: data.state || "",
          city: data.city || "",
          pincode: data.pincode || "",
        });

        setPhone(data.phone || "");
        setOriginalPhone(data.phone || "");
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const phoneChanged = phone !== originalPhone;

  /* ================= LOCATION ================= */
  const countries = getAllCountries();
  const states = form.country ? getStatesByCountry(form.country) : [];
  const cities =
    form.country && form.state
      ? getCitiesByState(form.country, form.state)
      : [];

  /* ================= OTP ================= */
  const sendOtp = async () => {
    if (!/^[0-9]{10}$/.test(phone)) {
      return toast.error("Enter valid 10 digit phone number");
    }

    try {
      const verifier = getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(
        auth,
        `+91${phone}`,
        verifier
      );
      window.confirmationResult = result;
      setOtpStep("sent");
      toast.success("OTP sent");
    } catch {
      toast.error("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      await window.confirmationResult.confirm(otp);
      setOtpStep("verified");
      setOriginalPhone(phone);
      toast.success("Phone number verified");
    } catch {
      toast.error("Invalid OTP");
    }
  };

  /* ================= SAVE PROFILE ================= */
  const onSave = async () => {
    if (!form.name.trim()) {
      return toast.error("Name is required");
    }

    if (!form.dob) {
      return toast.error("Date of birth is required");
    }

    if (phoneChanged && otpStep !== "verified") {
      return toast.error("Verify phone number before saving");
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

      setEditMode(false);
      setOtpStep("idle");
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Update failed"
      );
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
      <div id="recaptcha-container" />

      {/* HEADER */}
      <div className="text-center">
        <h1 className="text-3xl font-serif font-semibold">
          My Account
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal information and preferences
        </p>
      </div>

      {/* PROFILE CARD */}
      <Card className="rounded-2xl border bg-white p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-serif font-semibold">
            Profile Information
          </h2>

          {!editMode ? (
            <Button onClick={() => setEditMode(true)}>
              Edit Profile
            </Button>
          ) : (
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>

        {/* AVATAR */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold">
            {initials}
          </div>
          <div>
            <div className="text-lg font-semibold">{form.name}</div>
            <div className="text-sm text-muted-foreground">{form.email}</div>
          </div>
        </div>

        <Separator />

        {/* FORM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <Label>Name</Label>
            <Input
              className="mt-2"
              disabled={!editMode}
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              className="mt-2"
              disabled={!editMode}
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
                <Button
                  variant="outline"
                  disabled={!editMode}
                  className="mt-2 w-full justify-start"
                >
                  {form.dob ? format(form.dob, "PPP") : "Select date"}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
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

          {/* PHONE */}
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              className="mt-2"
              disabled={!editMode}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                setOtpStep("idle");
              }}
            />

            {editMode && phoneChanged && otpStep === "idle" && (
              <Button size="sm" variant="outline" onClick={sendOtp}>
                Verify Phone
              </Button>
            )}

            {otpStep === "sent" && (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <Button size="sm" onClick={verifyOtp}>
                  Verify
                </Button>
              </div>
            )}

            {otpStep === "verified" && (
              <p className="flex items-center gap-1 text-sm text-green-600">
                <ShieldCheck className="w-4 h-4" />
                Phone verified
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input
              className="mt-2"
              disabled={!editMode}
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>

          <Select
            disabled={!editMode}
            value={form.country}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, country: v, state: "", city: "" }))
            }
          >
            <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.isoCode} value={c.isoCode}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            disabled={!editMode || !form.country}
            value={form.state}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, state: v, city: "" }))
            }
          >
            <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.isoCode} value={s.isoCode}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            disabled={!editMode || !form.state}
            value={form.city}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, city: v }))
            }
          >
            <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div>
            <Label>Pincode</Label>
            <Input
              className="mt-2"
              disabled={!editMode}
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
