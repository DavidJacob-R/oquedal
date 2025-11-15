"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
};

type Item = { label: string; href: string; emoji: string };

const grupos: { titulo: string; items: Item[] }[] = [
  {
    titulo: "Pedidos",
    items: [
      { label: "Todos", href: "/admin/pedidos", emoji: "📦" },
      { label: "Aceptados", href: "/admin/aceptados", emoji: "✅" },
      { label: "Rechazados", href: "/admin/rechazados", emoji: "❌" },
    ],
  },
  {
    titulo: "Operacion",
    items: [
      { label: "Entregas", href: "/admin/entregas", emoji: "🚚" },
      { label: "Asignaciones", href: "/admin/asignaciones", emoji: "🧭" },
    ],
  },
  {
    titulo: "Gestion",
    items: [
      { label: "Clientes", href: "/admin/clientes", emoji: "👥" },
      { label: "Rutas", href: "/admin/rutas", emoji: "🗺️" },
      { label: "Materiales", href: "/admin/materiales", emoji: "📦" },
      { label: "Configuracion", href: "/admin/configuracion", emoji: "⚙️" },
    ],
  },
];

export default function AdminSidebar({ open, collapsed, onClose }: Props) {
  const pathname = usePathname() ?? "";

  return (
    <>
      <aside
        className={[
          "fixed left-0 z-50 hidden md:flex",
          collapsed ? "w-[var(--sidebar-w-collapsed)]" : "w-[var(--sidebar-w)]",
          "top-[var(--header-h)]",
          "h-[calc(100dvh-var(--header-h))]",
          "flex-col border-r border-white/10",
          "bg-neutral-900/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60",
          "transition-[width] duration-300 ease-in-out",
        ].join(" ")}
      >
       
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {grupos.map((g, idx) => (
            <div key={idx} className="mb-3">
              {!collapsed && <div className="px-2 pb-1 text-xs uppercase tracking-wide text-neutral-400">{g.titulo}</div>}
              <ul className="space-y-1">
                {g.items.map((it) => {
                  const active = pathname === it.href || pathname.startsWith(it.href + "/");
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={[
                          "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                          "border border-transparent",
                          active
                            ? "bg-orange-600/20 text-orange-300 border-orange-600/30 ring-1 ring-orange-500/20"
                            : "hover:bg-white/5 text-neutral-200",
                        ].join(" ")}
                        title={collapsed ? it.label : undefined}
                      >
                        <span className="shrink-0 text-base leading-none">{it.emoji}</span>
                        {!collapsed && <span className="truncate">{it.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="p-2">
          <div className="rounded-xl border border-white/10 p-3 bg-gradient-to-br from-neutral-900 to-neutral-800">
            {!collapsed ? (
              <>
                <div className="text-sm font-medium">Estado</div>
                <div className="mt-1 text-xs text-neutral-400">Sistema operativo</div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-2/3 bg-orange-500" />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center text-xl">🧩</div>
            )}
          </div>
        </div>
      </aside>

      <div
        className={[
          "fixed inset-x-0 z-40 md:hidden",
          open ? "block" : "hidden",
        ].join(" ")}
        style={{ top: "var(--header-h)" }}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div
          className="absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-neutral-900/95 backdrop-blur p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-12 items-center gap-2 px-1">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 ring-1 ring-white/20" />
            <div className="text-sm font-semibold tracking-wide">Panel <span className="text-orange-400">Admin</span></div>
          </div>
          <nav className="mt-2">
            {grupos.map((g, idx) => (
              <div key={idx} className="mb-3">
                <div className="px-2 pb-1 text-xs uppercase tracking-wide text-neutral-400">{g.titulo}</div>
                <ul className="space-y-1">
                  {g.items.map((it) => {
                    const active = pathname === it.href || pathname.startsWith(it.href + "/");
                    return (
                      <li key={it.href}>
                        <Link
                          href={it.href}
                          onClick={onClose}
                          className={[
                            "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                            "border border-transparent",
                            active
                              ? "bg-orange-600/20 text-orange-300 border-orange-600/30 ring-1 ring-orange-500/20"
                              : "hover:bg-white/5 text-neutral-200",
                          ].join(" ")}
                        >
                          <span className="shrink-0 text-base leading-none">{it.emoji}</span>
                          <span className="truncate">{it.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
