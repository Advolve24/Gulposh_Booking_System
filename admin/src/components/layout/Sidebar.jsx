import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  BedDouble,
  CalendarDays,
  Users,
  LogOut,
  Settings,
  X,
} from "lucide-react";

export default function Sidebar({ open, onClose }) {
  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { to: "/rooms", label: "Rooms", icon: BedDouble },
    { to: "/bookings", label: "Bookings", icon: CalendarDays },
    { to: "/users", label: "Users", icon: Users },
  ];

  return (
    <>
      {/* MOBILE OVERLAY */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          bg-primary text-white w-64
          flex flex-col
          transition-transform duration-300

          /* Mobile */
          fixed inset-y-0 left-0 z-50
          ${open ? "translate-x-0" : "-translate-x-full"}

          /* Desktop */
          lg:static lg:translate-x-0
        `}
      >
        {/* HEADER */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/20 shrink-0">
          <span className="font-semibold text-lg">Gulposh</span>
          <button className="lg:hidden" onClick={onClose}>
            <X />
          </button>
        </div>

        {/* NAV (grows naturally) */}
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition
                 ${
                   isActive
                     ? "bg-white/20"
                     : "hover:bg-white/10"
                 }`
              }
              onClick={onClose}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* FOOTER (NO absolute positioning) */}
        <div className="p-4 space-y-2 border-t border-white/20">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10"
            onClick={onClose}
          >
            <Settings size={18} />
            Settings
          </NavLink>

          <NavLink
            to="/logout"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10"
            onClick={onClose}
          >
            <LogOut size={18} />
            Logout
          </NavLink>
        </div>
      </aside>
    </>
  );
}
