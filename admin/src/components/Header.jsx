import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { adminMe } from "../api/admin";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [me, setMe] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    adminMe().then((u) => mounted && setMe(u)).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // helper for active link
  const isActive = (path) => location.pathname === path;

  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: logos */}
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 flex items-center" />
          <div className="p-2 rounded-md shadow flex gap-2">
            <img src="/logo1.png" alt="logo1" className="h-10" />
            <img src="/logo2.png" alt="logo2" className="w-[100px]" />
          </div>
        </Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-6">
          {[
            { path: "/dashboard", label: "Dashboard" },
            { path: "/rooms/new", label: "Add Room" },
            { path: "/bookings", label: "Bookings" },
            { path: "/users", label: "Users" },
            { path: "/villa-booking", label: "Book Entire Villa" },
            { path: "/logout", label: "Logout" },
          ].map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`text-sm font-medium transition-colors ${
                isActive(path)
                  ? "text-[#A0101C] h-8 flex items-center border rounded px-3 border-[#A0101C]"
                  : "text-gray-700 hover:text-[#A0101C]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile dropdown */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 px-3">
                <span className="max-w-[140px] truncate">
                  {me?.name ? me.name : "Menu"}
                </span>
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px]">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Signed in as
              </DropdownMenuLabel>
              <div className="px-2 pb-2 text-sm font-medium truncate">
                {me?.name || "Admin"}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard" className="mt-2">Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/rooms/new" className="mt-2">Add Room</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/bookings" className="mt-2">Bookings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/users" className="mt-2">Users</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/logout" className="text-red-600 mt-2">
                  Logout
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
