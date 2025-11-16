// components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { label: string; href: string; icon?: string };

const grupos: { titulo: string; items: Item[] }[] = [
  {
    titulo: "Operaciones",
    items: [
      { label: "Pedidos", href: "/admin/pedidos", icon: "📦" },
      { label: "Asignaciones", href: "/admin/asignaciones", icon: "🧭" },
    ],
  },
  {
    titulo: "Gestion",
    items: [
      { label: "Clientes", href: "/admin/clientes", icon: "👥" },
      { label: "Empleados", href: "/admin/empleados", icon: "🧑‍🤝‍🧑" },
      { label: "Rutas", href: "/admin/rutas", icon: "🗺️" },
      { label: "Configuracion", href: "/admin/configuracion", icon: "⚙️" },
    ],
  },
];

export default function AdminSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className={`fixed left-0 top-[64px] z-40 h-[calc(100dvh-64px)] ${collapsed ? "w-20" : "w-64"} border-r border-white/10 bg-neutral-900/80 p-3`}>
      <div className="mb-4 px-2">
        {!collapsed && <div className="text-xs text-neutral-400 uppercase mb-2">Admin</div>}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-gradient-to-br from-orange-500 to-orange-600" />
          {!collapsed && <div className="font-semibold">Panel</div>}
        </div>
      </div>

      <nav className="overflow-y-auto pr-2">
        {grupos.map((g,gi) => (
          <div key={gi} className="mb-4">
            {!collapsed && <div className="px-2 text-xs text-neutral-400 uppercase mb-2">{g.titulo}</div>}
            <ul className="space-y-1">
              {g.items.map(it => {
                const active = pathname === it.href || pathname?.startsWith(it.href + "/");
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? "bg-orange-600/20 text-orange-300" : "text-neutral-200 hover:bg-white/5"}`}
                    >
                      <span className="text-base">{it.icon}</span>
                      {!collapsed && <span className="truncate">{it.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
