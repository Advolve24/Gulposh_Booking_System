import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function Header() {
  const { user, logout, init, openAuth } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      await logout();
      await init?.();
      toast.success("Logged out");
      navigate("/", { replace: true });
    } catch {
      toast.error("Failed to logout");
    }
  };

  const initials = (user?.name || user?.email || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <header
      className="
        sticky top-0 z-50
        backdrop-blur-md
        bg-white/70
        border-b border-black/5
      "
    >
      <div className="max-w-7xl mx-auto px-6 h-[64px] flex items-center justify-between">

        {/* ================= LOGO ================= */}
          <Link to="/" className="flex items-center gap-2">
          <img src="/logo1.png" className="h-9" alt="logo" />
          <img src="/logo2.png" className="h-6" alt="brand" />
        </Link>

        {/* ================= RIGHT ACTIONS ================= */}
        <div className="flex items-center gap-4">

          {/* Visit website */}
          <a
            href="https://villagulposh.com/"
            target="_blank"
            rel="noreferrer"
            className="
              hidden sm:flex items-center gap-1
              text-sm text-[#6f5f55]
              hover:text-[#3b2f2a]
              transition
            "
          >
            Visit Website
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* Auth */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="
                    flex items-center gap-2
                    px-3 py-1.5
                    rounded-full
                    bg-white/60
                    backdrop-blur-md
                    border border-black/5
                    hover:bg-white
                    transition
                  "
                >
                  <div className="h-8 w-8 rounded-full bg-[#ba081c] text-white flex items-center justify-center text-sm font-semibold">
                    {initials}
                  </div>
                  <ChevronDown className="h-4 w-4 text-[#6f5f55]" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate("/my-account")}>
                  My Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/bookings")}>
                  My Bookings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/invoices")}>
                  My Invoices
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-red-600 focus:text-red-600"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={openAuth}
              className="
                px-5 py-2
                rounded-full
                bg-[#a11d2e]
                text-white text-sm
                hover:bg-[#8e1827]
                transition
              "
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
