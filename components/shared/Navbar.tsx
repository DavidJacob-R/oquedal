// components/shared/Navbar.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Who =
  | { ok: true; user: null }
  | { ok: true; user: { id: string; nombre: string | null; rol: "admin" | "cliente" | "repartidor" } }
  | { ok: false; user: null };

export default function Navbar() {
  const [who, setWho] = useState<Who>({ ok: true, user: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/whoami", { cache: "no-store" });
        const j = (await r.json()) as Who;
        setWho(j);
      } catch {
        setWho({ ok: true, user: null });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const user = who.ok ? who.user : null;
  const rol = user?.rol ?? null;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0b0b10]/80 backdrop-blur-lg">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600" />
          <span className="font-semibold tracking-wide text-zinc-100">oquedal logística</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60"
          >
            Inicio
          </Link>

          {rol === "cliente" && (
            <>
              <Link
                href="/cliente/pedidos"
                className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60"
              >
                Registrar pedido
              </Link>
              <Link
                href="/cliente/panel"
                className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60"
              >
                Mi panel
              </Link>
            </>
          )}

          {rol === "admin" && (
            <Link
              href="/admin/panel"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60"
            >
              Panel Central
            </Link>
          )}

          {rol === "repartidor" && (
            <Link
              href="/repartidor/rutas"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60"
            >
              Mis rutas
            </Link>
          )}

          {rol && (
            <span className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm border border-zinc-800/60 bg-zinc-900/50 text-zinc-200">
              {rol === "admin" ? `Administrador: ${user?.nombre ?? "Admin"}` :
               rol === "repartidor" ? `Repartidor: ${user?.nombre ?? "Repartidor"}` :
               (user?.nombre ?? "Cliente")}
            </span>
          )}

          {!rol && !loading && (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-sm border border-violet-500/40 bg-zinc-900 hover:border-violet-400/70 text-zinc-200"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="px-3 py-1.5 rounded-lg text-sm border border-emerald-500/40 bg-zinc-900 hover:border-emerald-400/70 text-zinc-200"
              >
                Registrarse
              </Link>
            </>
          )}

          {rol && (
            // Usamos link directo a /logout para que el servidor borre cookies y redirija
            <a
              href="/logout"
              className="px-3 py-1.5 rounded-lg text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-500"
              title="Cerrar sesión"
            >
              Salir
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}
