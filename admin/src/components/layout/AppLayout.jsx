import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        onClose={() => setSidebarOpen(false)}
      />

      {/* CONTENT */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-300
          ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}
        `}
      >
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 mt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
