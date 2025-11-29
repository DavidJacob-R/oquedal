"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";


type WhoAmI =
  | { ok: true; user: null }
  | { ok: true; user: { id: string; nombre: string; rol: "admin" | "cliente" } }
  | { ok: false; user: null };

export default function Navbar() {
  const [uid, setUid] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [rol, setRol] = useState<"admin" | "cliente" | null>(null);

  useEffect(() => {
    try { setUid(localStorage.getItem("usuario_id")); } catch {}
    try { setAdminId(localStorage.getItem("admin_id")); } catch {}

    (async () => {
      try {
        const r = await fetch("/api/whoami", { cache: "no-store" });
        const j: WhoAmI = await r.json();
        if (j.ok && j.user) {
          setNombre(j.user.nombre || null);
          setRol(j.user.rol);
        } else {
          setNombre(null);
          setRol(null);
        }
      } catch {
        setNombre(null);
        setRol(null);
      }
    })();
  }, []);

  const cerrarCliente = () => {
    try {
      localStorage.removeItem("usuario_id");
      document.cookie = "usuario_id=; path=/; max-age=0; samesite=lax";
    } catch {}
    window.location.href = "/";
  };

  const cerrarAdmin = () => {
    try {
      localStorage.removeItem("admin_id");
      document.cookie = "admin_id=; path=/; max-age=0; samesite=lax";
    } catch {}
    window.location.href = "/login";
  };

  const isAdmin = !!adminId || rol === "admin";
  const isCliente = (!!uid || rol === "cliente") && !isAdmin;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0b0b10]/80 backdrop-blur-lg">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
<Link href="/" className="flex items-center gap-2">
  <Image
    src="/logo-oquedal.png"
    alt="Oquedal logística"
    width={65}
    height={65}
    className="rounded-full"
  />
  <span className="font-semibold tracking-wide text-zinc-100">oquedal logística</span>
</Link>


        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60"
          >
            Inicio
          </Link>

          {isCliente && (
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

          {isAdmin && (
            <Link
              href="/admin/panel"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60"
            >
              Panel Central
            </Link>
          )}

          {(isCliente || isAdmin) && (
            <span className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm border border-zinc-800/60 bg-zinc-900/50 text-zinc-200">
              {isAdmin ? `Administrador: ${nombre ?? "Admin"}` : (nombre ?? "Cliente")}
            </span>
          )}

          {/* SIN sesión: un botón para iniciar y otro para registrarse */}
          {!isAdmin && !isCliente && (
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

          {isCliente && (
            <button
              onClick={cerrarCliente}
              className="px-3 py-1.5 rounded-lg text-sm text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
              title="Cerrar sesión cliente"
            >
              Cerrar sesión
            </button>
          )}

          {isAdmin && (
            <button
              onClick={cerrarAdmin}
              className="px-3 py-1.5 rounded-lg text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-500"
              title="Cerrar sesión admin"
            >
              Salir admin
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
