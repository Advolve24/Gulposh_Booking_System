import { useEffect, useState } from "react";
import { useAuth } from "../store/auth";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Shield } from "lucide-react";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.isAdmin) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      await toast.promise(login(email, password), {
        loading: "Signing in…",
        success: "Welcome back!",
        error: (err) => err?.response?.data?.message || err.message || "Login failed",
      });

      const to = location.state?.from?.pathname || "/dashboard";
      navigate(to, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#fbf8f4]">
    {/* LEFT IMAGE SECTION */}
    <div className="relative h-[40vh] lg:h-auto">
  <img
    src="/LoginImg.webp"
    alt="Villa Gulposh"
    className="absolute inset-0 h-full w-full object-cover"
  />

  {/* Gradient Overlay */}
  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

  {/* Text */}
  <div className="relative z-10 flex h-full items-end px-6 pb-8 lg:p-12">
    <div className="text-white max-w-md">
      <p className="text-xs tracking-widest uppercase mb-1 opacity-90">
        Welcome back
      </p>
      <h1 className="text-[36px] lg:text-[50px] font-serif leading-tight mb-1">
        Villa Gulposh
      </h1>
      <p className="text-sm opacity-90 leading-relaxed">
        Manage your exclusive property with elegance and ease.
      </p>
    </div>
  </div>
</div>

    {/* RIGHT LOGIN SECTION */}
    <div className="flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#5b1f2b] text-white">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-[24px] font-medium font-serif text-gray-800">
              Admin Portal
            </span>
          </div>

          <h2 className="text-[36px] font-serif mb-1">Sign in</h2>
          <p className="text-sm text-muted-foreground">
            Use your administrator credentials to continue.
          </p>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* FORM */}
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#5b1f2b] hover:bg-[#4a1923]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {/* FOOTER */}
        <div className="mt-10 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Villa Gulposh</span>
          <Link
            to="https://gulposhbookingsystem.netlify.app/"
            className="flex items-center gap-1 text-[#5b1f2b] hover:underline"
          >
            ← Back to site
          </Link>
        </div>
      </div>
    </div>
  </div>
)
}