import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile } from "../api/user";
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
} from "lucide-react";

export default function MyAccount() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    (async () => {
      try {
        const me = await getMyProfile();
        setName(me.name || "");
        setEmail(me.email || "");
        setPhone(me.phone || "");
        setAddress(me.address || "Mumbai, Maharashtra, India");
      } catch (e) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ================= SAVE ================= */
  const onSave = async () => {
    setSaving(true);
    try {
      const payload = { name, email, address };
      await updateMyProfile(payload);
      toast.success("Profile updated");
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  const initials =
    name
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

      {/* PAGE HEADER */}
      <div className="text-center">
        <h1 className="text-3xl font-serif font-semibold">
          My Account
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal information and preferences
        </p>
      </div>

      {/* PROFILE CARD */}
      <Card className="rounded-2xl border bg-white p-6 sm:p-8">

        {/* HEADER ROW */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-serif font-semibold">
            Profile Information
          </h2>

          <Button
            size="sm"
            className="rounded-lg"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Edit Profile"}
          </Button>
        </div>

        {/* AVATAR ROW */}
        <div className="mt-6 flex items-center gap-4">
          <div className="
            w-16 h-16
            rounded-full
            bg-primary
            text-primary-foreground
            flex items-center justify-center
            text-xl font-semibold
          ">
            {initials}
          </div>

          <div>
            <div className="text-lg font-semibold">
              {name || "Your Name"}
            </div>
            <div className="text-sm text-muted-foreground">
              {email || "email@example.com"}
            </div>
          </div>
        </div>

        <div className="my-6 border-t" />

        {/* FORM GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* FIRST NAME */}
          <div>
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              First Name
            </Label>
            <Input
              className="mt-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* LAST NAME (optional split UI) */}
          <div>
            <Label>Last Name</Label>
            <Input
              className="mt-2"
              value=""
              placeholder="—"
              disabled
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PHONE */}
          <div>
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </Label>
            <Input
              className="mt-2 bg-muted cursor-not-allowed"
              value={phone}
              disabled
            />
          </div>

          {/* ADDRESS (FULL WIDTH) */}
          <div className="sm:col-span-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address
            </Label>
            <Input
              className="mt-2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* DANGER ZONE */}
      <Card className="
        border border-red-300
        bg-red-50
        rounded-2xl
        p-6
      ">
        <h3 className="text-lg font-semibold text-red-600 mb-1">
          Danger Zone
        </h3>

        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data
        </p>

        <Button
          variant="destructive"
          className="rounded-xl"
        >
          Delete Account
        </Button>
      </Card>
    </div>
  );
}
