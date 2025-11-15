"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo, useCallback } from "react";

type NavItem = { label: string; href: string };

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const nav: NavItem[] = useMemo(
    () => [
      { label: "Panel", href: "/admin/panel" },
      { label: "Asignaciones", href: "/admin/asignaciones" },
      { label: "Entregas", href: "/admin/entregas" },
    ],
    []
  );

  const isActive = useCallback(
    (href: string) => {
      if (!pathname) return false;
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname]
  );

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0b10] text-zinc-100">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-zinc-900/80 bg-[#0b0b10]/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-sm hover:border-zinc-600"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
              title="Abrir menu"
            >
              ☰ Menu
            </button>
            <div className="font-semibold tracking-wide">Oquedal · Administrador</div>
          </div>
        </div>
      </header>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[280px] border-r border-zinc-900 bg-[#0b0b10] transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-900">
          <div className="font-semibold">Menu</div>
          <button
            className="rounded-md border border-zinc-800 px-2 py-1 text-sm hover:border-zinc-600"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menu"
          >
            ✕
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm border ${
                isActive(item.href)
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-200"
                  : "border-zinc-900 hover:border-zinc-700 text-zinc-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
