// components/shared/GlobalTopbar.tsx
"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

export default function GlobalTopbar() {
  const pathname = usePathname();

  // rutas donde NO queremos que aparezca el topbar global
  const HIDE_ON_PREFIXES = useMemo(() => ["/admin", "/api/admin"], []);

  // Si la ruta empieza por alguna de las prefixes -> no mostrar
  if (!pathname || HIDE_ON_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  // Topbar publico (usa tus clases/markup, este es un ejemplo simple)
  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 bg-white/95 backdrop-blur border-b border-neutral-200">
      <div className="mx-auto max-w-[1200px] px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-orange-500" />
          <span className="font-semibold text-neutral-900">Oquedal</span>
        </div>

        <nav className="hidden md:flex items-center gap-4">
          <a href="/" className="text-sm text-neutral-700">Inicio</a>
          <a href="/about" className="text-sm text-neutral-700">Contacto</a>
        </nav>
      </div>
    </header>
  );
}
