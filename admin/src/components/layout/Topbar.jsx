import { Menu, Bell, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { adminGlobalSearch } from "@/api/admin";

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
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </button>
  );
}

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);

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
    if (pathname.startsWith("/block-dates")) return "Calendar";
    if (pathname.startsWith("/villa-booking")) return "Book Entire Villa";
    return "Dashboard";
  };

  return (
    <header
      className="
        sticky top-0 z-40 h-16
        flex items-center
        bg-white/70 backdrop-blur-xl
        border-b border-white/30
        lg:fixed lg:top-0 lg:right-0
        lg:left-[var(--sidebar-width)]
        transition-all duration-300
      "
    >
      <div className="relative w-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={onMenuClick}
          >
            <Menu size={20} />
          </button>

          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#2b1e1e] truncate">
            {getPageTitle()}
          </h1>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          {/* SEARCH */}
          <div className="relative hidden sm:block">
            <div className="flex items-center bg-white/60 rounded-full px-4 py-2 border">
              <Search size={16} className="mr-2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users, bookings, rooms..."
                className="bg-transparent outline-none w-56"
              />
            </div>

            {results && (
              <div className="absolute mt-2 w-full bg-white border rounded-xl shadow-lg z-50">
                {results.users?.length > 0 && (
                  <Section title="Users">
                    {results.users.map((u) => (
                      <Item
                        key={u._id}
                        label={u.name}
                        sub={u.email}
                        onClick={() => navigate(`/users/${u._id}`)}
                      />
                    ))}
                  </Section>
                )}
              </div>
            )}
          </div>

          <Bell className="text-muted-foreground" />

          <div className="flex items-center gap-2">
            <div className="h-9 w-9 flex items-center justify-center rounded-full bg-primary/20 text-gray-500">
            <span className="text-[16px]">A</span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-[#2b1e1e]">
              Admin
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
