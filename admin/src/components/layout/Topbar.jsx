import { Menu, Bell, Search } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation();

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname === "/rooms") return "Rooms";
    if (pathname === "/rooms/new") return "Add Room";
    if (pathname === "/users") return "Users";
    if (pathname === "/bookings") return "Bookings";
    if (pathname === "/villa-booking") return "Book Villa";
    if (pathname.startsWith("/room/")) return "Edit Room";
    if (pathname.startsWith("/rooms/view/")) return "Room Details";
    if (pathname.startsWith("/invoice/")) return "Invoice";
    return "Dashboard";
  };

  return (
    <header
      className="
        /* MOBILE & TABLET */
        sticky top-0

        /* DESKTOP */
        lg:fixed lg:top-0 lg:right-0
        lg:left-[260px]

        z-40 h-16
        flex items-center

        bg-white/70
        backdrop-blur-xl
        border-b border-white/30
      "
    >
      {/* BACKDROP SAFETY LAYER */}
      <div className="absolute inset-0 bg-white/70 pointer-events-none" />

      {/* CONTENT */}
      <div className="relative w-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* LEFT */}
        <div className="flex items-center gap-3 min-w-0">
          {/* MOBILE MENU */}
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={onMenuClick}
          >
            <Menu size={20} />
          </button>

          {/* PAGE TITLE */}
          <h1
            className="
              font-serif text-xl sm:text-2xl
              font-semibold tracking-tight
              text-[#2b1e1e]
              truncate
            "
          >
            {getPageTitle()}
          </h1>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* SEARCH (hide on mobile) */}
          <div
            className="
              hidden sm:flex items-center
              bg-white/60 backdrop-blur-md
              rounded-full
              px-4 py-2
              text-sm
              border border-white/30
            "
          >
            <Search size={16} className="mr-2 text-muted-foreground" />
            <input
              placeholder="Search..."
              className="bg-transparent outline-none w-44 placeholder:text-muted-foreground"
            />
          </div>

          {/* NOTIFICATION */}
          <div className="relative">
            <Bell className="text-muted-foreground" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
          </div>

          {/* USER */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/20 backdrop-blur" />
            <span className="hidden sm:block text-sm font-medium text-[#2b1e1e]">
              Admin
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
