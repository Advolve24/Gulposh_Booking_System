import { useEffect, useState } from "react";
import { api } from "../api/http";
import { toast } from "sonner";

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
  ShieldCheck,
} from "lucide-react";

export default function MyAccount() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
  });

  const [originalPhone, setOriginalPhone] = useState("");
  const [otpStep, setOtpStep] = useState("idle"); // idle | sent | verified
  const [otp, setOtp] = useState("");

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");

        const [firstName = "", lastName = ""] =
          (data.name || "").split(" ");

        setForm({
          firstName,
          lastName,
          email: data.email || "",
          phone: data.phone || "",
          address: [
            data.city,
            data.state,
            data.country,
          ]
            .filter(Boolean)
            .join(", "),
        });

        setOriginalPhone(data.phone || "");
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const phoneChanged = form.phone !== originalPhone;

  /* ================= OTP ================= */
  const sendOtp = async () => {
    if (!/^[0-9]{10}$/.test(form.phone)) {
      return toast.error("Enter valid 10 digit phone number");
    }

    try {
      await api.post("/auth/phone/send-otp", {
        phone: form.phone,
      });
      setOtpStep("sent");
      toast.success("OTP sent");
    } catch {
      toast.error("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      await api.post("/auth/phone/verify", {
        phone: form.phone,
        otp,
      });
      setOtpStep("verified");
      toast.success("Phone verified");
    } catch {
      toast.error("Invalid OTP");
    }
  };

  /* ================= SAVE ================= */
  const onSave = async () => {
    if (!form.firstName.trim()) {
      return toast.error("First name required");
    }

    if (phoneChanged && otpStep !== "verified") {
      return toast.error("Verify phone number first");
    }

    try {
      setSaving(true);

      await api.put("/auth/me", {
        name: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
      });

      setOriginalPhone(form.phone);
      setEditMode(false);
      setOtpStep("idle");
      toast.success("Profile updated");
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  const initials =
    `${form.firstName[0] || ""}${form.lastName[0] || ""}`.toUpperCase();

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
          Manage your personal information and preferences
        </p>
      </div>

      {/* PROFILE CARD */}
      <Card className="rounded-2xl border bg-white p-6 sm:p-8 space-y-6">

        {/* TITLE ROW */}
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
            {initials || "U"}
          </div>

          <div>
            <div className="text-lg font-semibold">
              {form.firstName} {form.lastName}
            </div>
            <div className="text-sm text-muted-foreground">
              {form.email}
            </div>
          </div>
        </div>

        <Separator />

        {/* FORM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* FIRST NAME */}
          <div>
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              First Name
            </Label>
            <Input
              className="mt-2"
              disabled={!editMode}
              value={form.firstName}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstName: e.target.value }))
              }
            />
          </div>

          {/* LAST NAME */}
          <div>
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Last Name
            </Label>
            <Input
              className="mt-2"
              disabled={!editMode}
              value={form.lastName}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastName: e.target.value }))
              }
            />
          </div>

          {/* EMAIL */}
          <div>
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address
            </Label>
            <Input
              className="mt-2"
              value={form.email}
              disabled
            />
          </div>

          {/* PHONE */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </Label>

            <Input
              className="mt-2"
              disabled={!editMode}
              value={form.phone}
              onChange={(e) => {
                setForm((f) => ({
                  ...f,
                  phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                }));
                setOtpStep("idle");
              }}
            />

            {editMode && phoneChanged && otpStep === "idle" && (
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
                Phone verified
              </p>
            )}
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
              disabled
            />
          </div>
        </div>
      </Card>

      {/* DANGER ZONE */}
      <Card className="border border-red-200 bg-red-50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-red-600">
          Danger Zone
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Permanently delete your account and all associated data
        </p>

        <Button
          variant="destructive"
          className="mt-4"
        >
          Delete Account
        </Button>
      </Card>
    </div>
  );
}
