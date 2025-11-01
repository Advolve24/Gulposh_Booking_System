import { useState, useEffect } from "react";
import { useAuth } from "../store/authStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, EyeOff } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";


const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const isValidGmail = (email) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email.trim());
const isValidPhone = (phone) => /^[0-9]{10}$/.test(phone.trim());

export default function AuthModal() {
  const { showAuthModal, closeAuth, login, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", dob: null, });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const user = useAuth((state) => state.user);


  const validate = (mode) => {
    const newErrors = {};
    if (mode === "login") {
      if (!form.email.trim()) newErrors.email = "Email is required.";
      else if (!isValidEmail(form.email)) newErrors.email = "Enter a valid email.";
      if (!form.password) newErrors.password = "Password is required.";
    } else if (mode === "register") {
      if (!form.name.trim()) newErrors.name = "Name is required.";
      if (!form.email.trim()) newErrors.email = "Email is required.";
      else if (!isValidEmail(form.email)) newErrors.email = "Enter a valid email address.";
      else if (!isValidGmail(form.email)) newErrors.email = "Only Gmail addresses are allowed.";
      if (!form.phone.trim()) newErrors.phone = "Phone number is required.";
      else if (!isValidPhone(form.phone)) newErrors.phone = "Enter a valid 10-digit phone number.";
      if (!form.password) newErrors.password = "Password is required.";
      else if (form.password.length < 6) newErrors.password = "Password must be at least 6 characters.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onLogin = async () => {
  if (!validate("login")) return;
  setLoading(true);
  try {
    await login(form.email.trim(), form.password);
    toast.success("Signed in successfully 🎉"); 
    closeAuth(); 
  } catch (err) {
    if (err.response && err.response.status === 400 && err.response.data?.message) {
      const msg = err.response.data.message;
      if (msg.includes("Invalid credentials")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(msg);
      }
    } else {
      toast.error("Failed to sign in. Please try again.");
    }
  } finally {
    setLoading(false);
  }
};

  const onRegister = async () => {
  if (!validate("register")) return;
  const phone = form.phone.replace(/[^\d]/g, "").trim();
  setLoading(true);
  try {
    await register(form.name.trim(), form.email.trim(), form.password, phone, form.dob);
    toast.success("Account created successfully 🎉");
    closeAuth(); 
  } catch (err) {
    if (err.response && err.response.status === 400 && err.response.data?.message) {
      const msg = err.response.data.message;
      if (msg.includes("Email already registered")) {
        toast.error("Email is already in use, please enter another one");
      } else {
        toast.error(msg);
      }
    } else {
      toast.error("Failed to create account. Please try again.");
    }
  } finally {
    setLoading(false);
  }
};


  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((f) => ({ ...f, phone: digitsOnly }));
  };

  useEffect(() => {
    if (user?.name || user?.email || user?.phone || user?.dob) {
      setForm((f) => ({
        ...f,
        name: user?.name || f.name,
        email: user?.email || f.email,
        phone: user?.phone || f.phone,
        dob: user?.dob ? new Date(user.dob) : f.dob || "",
      }));
    }
  }, [user]);
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
            <div className="space-y-1">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@gmail.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <Button className="w-full" onClick={onLogin} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </TabsContent>

          {/* REGISTER */}
          <TabsContent value="register" className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="reg-name">Name</Label>
              <Input
                id="reg-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                autoComplete="name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@gmail.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="reg-phone">Phone</Label>
              <Input
                id="reg-phone"
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={handlePhoneChange}
                placeholder="10-digit mobile number"
                autoComplete="tel"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="reg-password">Password</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showRegisterPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="reg-dob">Date of Birth</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${!form.dob && "text-muted-foreground"
                      }`}
                  >
                    {form.dob ? format(form.dob, "PPP") : "Select your date of birth"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.dob}
                    onSelect={(date) => setForm((f) => ({ ...f, dob: date }))}
                    captionLayout="dropdown"
                    fromYear={1950}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
              {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
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
