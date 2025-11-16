"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RepartidorTopbar() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function goLogout() {
    if (busy) return;
    setBusy(true);
    try {
      // limpia rastros del lado cliente
      try {
        localStorage.removeItem("repartidor_id");
        localStorage.removeItem("admin_id");
        localStorage.removeItem("usuario_id");
        localStorage.removeItem("rol");
      } catch {}
      // navega a la página que borra cookies en el servidor
      router.push("/logout");
    } finally {
      setTimeout(() => setBusy(false), 300);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b10]/80 backdrop-blur-md">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/repartidor/rutas" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500" />
          <span className="font-medium tracking-wide text-zinc-100">Panel Repartidor</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/repartidor/rutas"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60"
          >
            Mis rutas
          </Link>

          <button
            onClick={goLogout}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm text-white bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-500 hover:to-red-500 disabled:opacity-60"
            title="Cerrar sesión"
            type="button"
          >
            {busy ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>
      </nav>
    </header>
  );
}
