// src/components/AuthModal.jsx
import { useState } from "react";
import { useAuth } from "../store/authStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Phone } from "lucide-react";

export default function AuthModal() {
  const { showAuthModal, closeAuth, login, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setLoading(true);
    try { await login(form.email.trim(), form.password); }
    finally { setLoading(false); }
  };

  const onRegister = async () => {
    // simple client-side checks
    const phone = form.phone.replace(/[^\d+]/g, "").trim();
    if (!form.name.trim()) return alert("Name is required");
    if (!form.email.trim()) return alert("Email is required");
    if (!form.password) return alert("Password is required");
    if (!phone) return alert("Phone is required");

    setLoading(true);
    try { await register(form.name.trim(), form.email.trim(), form.password, phone); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={showAuthModal} onOpenChange={(open) => !open && closeAuth()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome</DialogTitle>
          <DialogDescription>Sign in or create a new account to continue.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="register">Sign up</TabsTrigger>
          </TabsList>

          {/* LOGIN */}
          <TabsContent value="login" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <Button className="w-full" onClick={onLogin} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </TabsContent>

          {/* REGISTER */}
          <TabsContent value="register" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reg-name">Name</Label>
              <Input
                id="reg-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-phone">Phone</Label>
              <div className="relative">
                <Input
                  id="reg-phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Your phone number"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Create a strong password"
                autoComplete="new-password"
              />
            </div>

            <Button className="w-full" onClick={onRegister} disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
