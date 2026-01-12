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
    dob: null,
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  const [phone, setPhone] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");

  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState("idle"); 
  // idle | sent | verified

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

  /* ================= LOCATION ================= */
  const countries = getAllCountries();
  const states = form.country ? getStatesByCountry(form.country) : [];
  const cities =
    form.country && form.state
      ? getCitiesByState(form.country, form.state)
      : [];

  const phoneChanged = phone !== originalPhone;

  /* ================= OTP ================= */
  const sendOtp = async () => {
    if (!/^[0-9]{10}$/.test(phone)) {
      return toast.error("Enter valid 10-digit phone number");
    }

    try {
      await api.post("/auth/phone/send-otp", { phone });
      setOtpStep("sent");
      toast.success("OTP sent to new number");
    } catch {
      toast.error("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      await api.post("/auth/phone/verify", { phone, otp });
      setOtpStep("verified");
      toast.success("Phone number verified");
    } catch {
      toast.error("Invalid OTP");
    }
  };

  /* ================= SAVE ================= */
  const onSave = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    if (!form.dob) return toast.error("Date of birth required");

    if (phoneChanged && otpStep !== "verified") {
      return toast.error("Verify phone number before saving");
    }

    try {
      setSaving(true);
      await api.put("/auth/me", {
        ...form,
        phone,
        dob: form.dob.toISOString(),
      });

      setOriginalPhone(phone);
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center">Loading…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

      {/* HEADER */}
      <div className="text-center">
        <h1 className="text-3xl font-serif font-semibold">My Account</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal information and preferences
        </p>
      </div>

      {/* PROFILE CARD */}
      <Card className="rounded-2xl border bg-white p-6 sm:p-8 space-y-6">

        {/* HEADER ROW */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-serif font-semibold">
            Profile Information
          </h2>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>

        {/* PHONE */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Number
          </Label>

          <Input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
              setOtpStep("idle");
            }}
          />

          {phoneChanged && otpStep === "idle" && (
            <Button size="sm" variant="outline" onClick={sendOtp}>
              Verify New Number
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
              Phone number verified
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
