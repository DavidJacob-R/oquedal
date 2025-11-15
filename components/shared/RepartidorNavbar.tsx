"use client";

import Link from "next/link";

export default function RepartidorNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0b0b10]/80 backdrop-blur-lg">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/repartidor" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500" />
          <span className="font-semibold tracking-wide text-zinc-100">Repartidor</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/repartidor/pedidos"
            className="px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60"
          >
            Mis entregas
          </Link>
          <Link
            href="/repartidor/perfil"
            className="px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60"
          >
            Perfil
          </Link>
        </div>
      </nav>
    </header>
  );
}
