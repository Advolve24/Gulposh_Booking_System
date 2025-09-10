// src/components/AuthModal.jsx
import { useState } from "react";
import { useAuth } from "../store/authStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function AuthModal() {
  const { showAuthModal, closeAuth, login, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const onLogin = async () => {
    await login(form.email, form.password);
  };

  const onRegister = async () => {
    await register(form.name, form.email, form.password);
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

          <TabsContent value="login" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <Button className="w-full" onClick={onLogin}>Sign in</Button>
          </TabsContent>

          <TabsContent value="register" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email2">Email</Label>
              <Input
                id="email2"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password2">Password</Label>
              <Input
                id="password2"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Create a strong password"
              />
            </div>
            <Button className="w-full" onClick={onRegister}>Create account</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
