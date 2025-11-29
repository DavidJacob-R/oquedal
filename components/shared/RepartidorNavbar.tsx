"use client";

import Link from "next/link";
import Image from "next/image";


export default function RepartidorNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0b0b10]/80 backdrop-blur-lg">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
<Link href="/repartidor" className="flex items-center gap-2">
  <Image
    src="/logo-oquedal.png"
    alt="Oquedal logística"
    width={65}
    height={65}
    className="rounded-full"
  />
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
