// src/pages/MyAccount.jsx
import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile, changeMyPassword } from "../api/user";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";

const fmt = (d) => (d ? format(new Date(d), "dd MMM yy") : "—");

export default function MyAccount() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // profile fields
  const [id, setId]           = useState("");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [joined, setJoined]   = useState("");

  // change password fields
  const [curPw, setCurPw]     = useState("");
  const [newPw, setNewPw]     = useState("");
  const [newPw2, setNewPw2]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const me = await getMyProfile();
        setId(me.id); setName(me.name || ""); setEmail(me.email || "");
        setPhone(me.phone || ""); setJoined(me.createdAt || "");
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const updated = await updateMyProfile({ name, email, phone });
      setName(updated.name || "");
      setEmail(updated.email || "");
      setPhone(updated.phone || "");
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    if (!curPw || !newPw) return toast.error("Enter current and new password");
    if (newPw.length < 6)  return toast.error("New password must be at least 6 characters");
    if (newPw !== newPw2)  return toast.error("Passwords do not match");

    setPwSaving(true);
    try {
      await changeMyPassword({ currentPassword: curPw, newPassword: newPw });
      toast.success("Password changed");
      setCurPw(""); setNewPw(""); setNewPw2("");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold">My account</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input className="mt-2" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input className="mt-2" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input className="mt-2" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <Label>Joined</Label>
                  <Input className="mt-2" value={fmt(joined)} disabled />
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={onSave} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="font-medium">Change password</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Current password</Label>
                    <Input type="password" className="mt-2" value={curPw} onChange={e => setCurPw(e.target.value)} />
                  </div>
                  <div>
                    <Label>New password</Label>
                    <Input type="password" className="mt-2" value={newPw} onChange={e => setNewPw(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Confirm new password</Label>
                    <Input type="password" className="mt-2" value={newPw2} onChange={e => setNewPw2(e.target.value)} />
                  </div>
                </div>
                <Button variant="secondary" onClick={onChangePassword} disabled={pwSaving}>
                  {pwSaving ? "Updating..." : "Update password"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
