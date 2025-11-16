"use client";

import { useCallback, useEffect, useState } from "react";
import AdminTopbar from "./AdminTopbar";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen(v => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleCollapsed = useCallback(() => setCollapsed(v => !v), []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--header-h", window.matchMedia("(min-width: 768px)").matches ? "64px" : "56px");
    root.style.setProperty("--sidebar-w", "256px");
    root.style.setProperty("--sidebar-w-collapsed", "80px");
    const l = () => root.style.setProperty("--header-h", window.matchMedia("(min-width: 768px)").matches ? "64px" : "56px");
    window.addEventListener("resize", l);
    return () => window.removeEventListener("resize", l);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-neutral-100">
      <AdminTopbar onMenuClick={toggleSidebar} onCollapseClick={toggleCollapsed} collapsed={collapsed} />
      <AdminSidebar collapsed={collapsed} />
      <main
        className={[
          "pt-[var(--header-h)]",
          "transition-[margin] duration-300 ease-in-out",
          collapsed ? "md:ml-[var(--sidebar-w-collapsed)]" : "md:ml-[var(--sidebar-w)]",
          "p-4 md:p-6 lg:p-8",
        ].join(" ")}
      >
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
