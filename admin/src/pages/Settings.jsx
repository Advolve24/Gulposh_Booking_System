import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/store/auth";
import { useNotificationStore } from "@/store/useNotificationStore";
import { Bell, User, Save } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

// shadcn
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* =====================================================
   SETTINGS PAGE
===================================================== */

export default function Settings() {
  const [tab, setTab] = useState("profile");
  const [searchParams] = useSearchParams();

  useEffect(() => {
const tabFromUrl = searchParams.get("tab");
if (tabFromUrl) {
setTab(tabFromUrl);
}
}, [searchParams]);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-2 sm:px-6 space-y-6">

        {/* ================= PILL TABS ================= */}
        <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
          <PillTab
            active={tab === "profile"}
            onClick={() => setTab("profile")}
            icon={<User size={16} />}
            label="Profile"
          />
          <PillTab
            active={tab === "notifications"}
            onClick={() => setTab("notifications")}
            icon={<Bell size={16} />}
            label="Notifications"
          />
        </div>

        {/* ================= TAB CONTENT ================= */}
        {tab === "profile" && <ProfileTab />}
        {tab === "notifications" && <NotificationsTab />}
      </div>
    </AppLayout>
  );
}

/* =====================================================
   PILL TAB (shadcn-style)
===================================================== */

function PillTab({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
        "focus:outline-none focus:ring-2 focus:ring-primary/30",
        active
          ? "bg-background shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-background/60"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* =====================================================
   PROFILE TAB
===================================================== */

function ProfileTab() {
  const { user, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    propertyName: "",
    address: "",
  });

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      propertyName: user.propertyName || "Gulposh Villa",
      address: user.address || "Karjat, Maharashtra",
    });
  }, [user]);

  const saveProfile = async () => {
    try {
      setSaving(true);
      await updateProfile(form);
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border rounded-2xl p-4 sm:p-10">
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-serif font-semibold">
          Profile Information
        </h2>
        <p className="text-sm text-muted-foreground">
          Update your personal details and contact information.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[140px_1fr] gap-10">
        {/* AVATAR */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-28 w-28 rounded-full bg-muted flex items-center justify-center">
            <User size={40} className="text-primary" />
          </div>
          <Button variant="outline" size="sm">
            Change Photo
          </Button>
        </div>

        {/* FORM */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </Field>

            <Field label="Email Address">
              <Input
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />
            </Field>
          </div>

          {/* PHONE (FULL WIDTH) */}
          <Field label="Phone Number">
            <Input
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
            />
          </Field>

        <Separator />

        <h3 className="font-serif font-medium text-lg">
          Property Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Field label="Property Name">
            <Input
              value={form.propertyName}
              onChange={(e) =>
                setForm({ ...form, propertyName: e.target.value })
              }
            />
          </Field>

          <Field label="Address">
            <Input
              value={form.address}
              onChange={(e) =>
                setForm({ ...form, address: e.target.value })
              }
            />
          </Field>
        </div>

        <div className="flex justify-end pt-6">
          <Button
            onClick={saveProfile}
            disabled={saving}
            className="rounded-xl px-6"
          >
            <Save size={16} className="mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
    </div >
  );
}

/* =====================================================
   NOTIFICATIONS TAB (COMPACT)
===================================================== */

function NotificationsTab() {
  const { items, unread, markAllRead, pruneOld } =
    useNotificationStore();

  useEffect(() => {
    pruneOld(30);
  }, [pruneOld]);

  const newItems = items.filter((n) => !n.isRead);
  const oldItems = items.filter((n) => n.isRead);

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {unread} unread notifications
        </p>

        {unread > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No notifications yet
        </p>
      )}

      {/* ================= NEW ================= */}
      {newItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            New
          </h4>

          <div className="space-y-2">
            {newItems.map((n) => (
              <CompactNotification key={n.createdAt} n={n} highlight />
            ))}
          </div>
        </div>
      )}

      {/* ================= OLDER ================= */}
      {oldItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Older
          </h4>

          <div className="space-y-2">
            {oldItems.map((n) => (
              <CompactNotification key={n.createdAt} n={n} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function CompactNotification({ n, highlight }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2 text-sm",
        highlight
          ? "bg-primary/5 border-primary/30"
          : "bg-muted/40"
      )}
    >
      {/* DOT */}
      <span
        className={cn(
          "mt-1 h-2 w-2 rounded-full",
          highlight ? "bg-primary" : "bg-muted-foreground/40"
        )}
      />

      {/* CONTENT */}
      <div className="flex-1 leading-tight">
        <div className="font-medium">
          {n.title}
        </div>

        <div className="text-xs text-muted-foreground line-clamp-2">
          {n.message}
        </div>

        <div className="text-[11px] text-muted-foreground mt-0.5">
          {new Date(n.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
/* =====================================================
   FIELD
===================================================== */

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
