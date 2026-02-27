import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ExternalLink,
  User,
  Calendar,
  FileText,
  LogOut,
} from "lucide-react";
import { motion } from "framer-motion";
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
        bg-white/60
        border-b border-black/5
      "
    >
      <div className="max-w-7xl mx-auto px-6 h-[64px] flex items-center justify-between">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/Gulposh-Logo2.png" className="md:w-[180px] w-[150px]" alt="logo" />
        </Link>

        {/* RIGHT */}
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

          {/* AUTH */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="
                    flex items-center gap-2
                    px-3 py-1.5
                    rounded-full
                    bg-white/70
                    backdrop-blur-md
                    border border-black/5
                    hover:bg-white
                    transition  mt-2 mb-2
                  "
                >
                  <div className="h-8 w-8 rounded-full bg-[#ba081c] text-white flex items-center justify-center text-sm font-semibold">
                    {initials}
                  </div>
                  <ChevronDown className="h-4 w-4 text-[#6f5f55]" />
                </button>
              </DropdownMenuTrigger>

              {/* DROPDOWN */}
              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="
                  w-[260px]
                  rounded-2xl
                  p-2
                  shadow-xl
                  border
                  bg-white mt-2
                "
                asChild
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <div>
                    {/* USER INFO */}
                    <div className="px-3 py-3 rounded-xl bg-muted mb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#ba081c] text-white flex items-center justify-center font-semibold">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {user.name || "Guest"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LINKS */}
                    <DropdownMenuItem
                      onClick={() => navigate("/my-account")}
                      className="rounded-lg flex items-center gap-3 px-3 py-2"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      My Account
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => navigate("/bookings")}
                      className="rounded-lg flex items-center gap-3 px-3 py-2"
                    >
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      My Bookings
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => navigate("/invoices")}
                      className="rounded-lg flex items-center gap-3 px-3 py-2"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      My Invoices
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-2" />

                    {/* LOGOUT */}
                    <DropdownMenuItem
                      onClick={onLogout}
                      className="
                        rounded-lg
                        flex items-center gap-3
                        px-3 py-2
                        text-red-600
                        focus:text-red-600
                        focus:bg-red-50
                      "
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </DropdownMenuItem>
                  </div>
                </motion.div>
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
