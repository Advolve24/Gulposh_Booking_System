import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
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
        border-b border-[#eadfd6]
        shadow-sm
      "
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo1.png" className="h-9" alt="logo" />
          <img src="/logo2.png" className="h-6" alt="brand" />
        </Link>

        {/* PROFILE */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="
                  flex items-center gap-2
                  px-3 py-1.5
                  rounded-full
                  border-2 border-[#ecd6d6]
                  bg-white/80
                  hover:bg-white
                  transition
                "
              >
                {/* Avatar */}
                <div
                  className="
                    h-8 w-8
                    rounded-full
                    bg-primary
                    text-primary-foreground
                    flex items-center justify-center
                    text-sm font-semibold
                  "
                >
                  {initials}
                </div>

                {/* Name */}
                <span className="text-sm font-medium text-gray-800">
                  {user.name || user.email}
                </span>

                {/* Arrow */}
                <ChevronDown className="w-4 h-4 text-gray-500" />
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
              px-4 py-2
              rounded-full
              border border-border
              text-sm
              bg-white/80
            "
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
