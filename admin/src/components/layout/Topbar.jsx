import { Menu, Bell, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { adminGlobalSearch } from "@/api/admin";
import { useNavigate } from "react-router-dom";


function Section({ title, children }) {
  return (
    <div className="py-2">
      <div className="px-3 text-xs font-semibold text-muted-foreground uppercase">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Item({ label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 hover:bg-muted flex flex-col"
    >
      <span className="text-sm font-medium">{label}</span>
      {sub && (
        <span className="text-xs text-muted-foreground">{sub}</span>
      )}
    </button>
  );
}


export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
  if (!query.trim()) {
    setResults(null);
    return;
  }

  const t = setTimeout(async () => {
    const data = await adminGlobalSearch(query);
    setResults(data);
  }, 300);

  return () => clearTimeout(t);
}, [query]);


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
          <div className="relative hidden sm:block">
  <div className="flex items-center bg-white/60 rounded-full px-4 py-2 border">
    <Search size={16} className="mr-2 text-muted-foreground" />
    <input
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") e.preventDefault();
  }}
  placeholder="Search users, bookings, rooms..."
  className="bg-transparent outline-none w-56"
/>

  </div>

  {/* DROPDOWN */}
  {results && (
    <div className="absolute mt-2 w-full bg-white border rounded-xl shadow-lg z-50">
      
      {/* USERS */}
      {results.users?.length > 0 && (
        <Section title="Users">
          {results.users.map(u => (
            <Item
              key={u._id}
              label={u.name}
              sub={u.email}
              onClick={() => navigate(`/users/${u._id}`)}
            />
          ))}
        </Section>
      )}

      {/* BOOKINGS */}
      {results.bookings?.length > 0 && (
        <Section title="Bookings">
          {results.bookings.map(b => (
            <Item
              key={b._id}
              label={`Booking #${b._id.slice(-6)}`}
              sub={b.user?.name}
              onClick={() => navigate(`/bookings/${b._id}`)}
            />
          ))}
        </Section>
      )}

      {/* ROOMS */}
      {results.rooms?.length > 0 && (
        <Section title="Rooms">
          {results.rooms.map(r => (
            <Item
              key={r._id}
              label={r.name}
              onClick={() => navigate(`/rooms/view/${r._id}`)}
            />
          ))}
        </Section>
      )}
    </div>
  )}
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
