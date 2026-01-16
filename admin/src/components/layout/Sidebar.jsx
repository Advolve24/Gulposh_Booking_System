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

export default function Sidebar({
  open,
  collapsed,
  onToggleCollapse,
  onClose,
}) {
  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { to: "/rooms", label: "Rooms", icon: BedDouble },
    { to: "/bookings", label: "Bookings", icon: CalendarDays },
    { to: "/block-dates", label: "Calendar", icon: CalendarDays },
    { to: "/users", label: "Users", icon: Users },
  ];

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* MOBILE OVERLAY */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
  className={`
    fixed inset-y-0 left-0 z-50
    bg-primary text-white
    flex flex-col

    w-64
    ${collapsed ? "lg:w-20" : "lg:w-64"}

    ${open ? "translate-x-0" : "-translate-x-full"}
    lg:translate-x-0

    transition-[width,transform] duration-300
  `}
>




        {/* HEADER */}
        {/* HEADER */}
        <div className="relative h-16 flex items-center border-b border-white/20 px-4">
          {/* BRAND */}
          <span
            className={`font-semibold text-lg transition-opacity duration-200
      ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"}
    `}
          >
            Gulposh
          </span>

          {/* COLLAPSE BUTTON */}
          <button
            onClick={onToggleCollapse}
            className={`
      hidden lg:flex items-center justify-center
      absolute top-1/2 -translate-y-1/2
      h-8 w-8 rounded-md
      bg-primary/90 hover:bg-primary
      border border-white/20
      transition-all duration-300
      ${collapsed ? "-right-4" : "right-2"}
    `}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="text-white text-lg leading-none">
              {collapsed ? "›" : "‹"}
            </span>
          </button>

          {/* MOBILE CLOSE */}
          <button
            className="lg:hidden ml-auto"
            onClick={onClose}
          >
            <X />
          </button>
        </div>


        {/* NAV */}
        <nav className="flex-1 p-2 space-y-3 md:space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `
                flex items-center gap-3 px-3 py-3 md:py-3 rounded-lg text-[14px] md:text-sm
                transition justify-start lg:justify-start
                ${isActive ? "bg-white/20" : "hover:bg-white/10"}
              `
              }
            >
              <Icon size={18} className={`${collapsed ? " p-[6px] w-8 h-8 " : " "}`} />
              <span className={`${collapsed ? "lg:hidden" : "lg:inline"}`}>
                {label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* FOOTER */}
        <div className="p-2 border-t border-white/20 space-y-1">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 justify-center lg:justify-start"
          >
            <Settings size={18} />
            <span className={`${collapsed ? "lg:hidden" : "lg:inline"}`}>
              Settings
            </span>
          </NavLink>

          <NavLink
            to="/logout"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 justify-center lg:justify-start"
          >
            <LogOut size={18} />
            <span className={`${collapsed ? "lg:hidden" : "lg:inline"}`}>
              Logout
            </span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
