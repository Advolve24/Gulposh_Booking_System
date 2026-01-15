import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    onResize();

    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", next);
      return next;
    });
  };



  return (
    <div
      className="min-h-screen bg-background overflow-x-hidden"
      style={{
        "--sidebar-width": sidebarCollapsed ? "80px" : "256px",
      }}
    >
      {/* SIDEBAR */}
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        onClose={() => setSidebarOpen(false)}
      />


      {/* CONTENT */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-300
          ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}
        `}
      >
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 md:mt-16 mt-1">
          <div className="flex flex-col items-center md:block w-full max-w-screen-xl">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
