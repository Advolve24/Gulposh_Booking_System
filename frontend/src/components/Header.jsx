// src/components/Header.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    .split(" ")
    .map((s) => s[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <header className="w-full border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: logos */}
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 flex items-center">
            
          </div>
          <div className="p-2 rounded-md shadow flex gap-2">
            <img src="/logo1.png" alt="logo1" className="h-10" />
            <img src="/logo2.png" alt="logo2" className="w-[100px]" />
          </div>
        </Link>

        {/* Right: user */}
        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">
                    {user.name || user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/bookings")}>
                  My bookings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
           
            <Button variant="outline" onClick={openAuth}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
