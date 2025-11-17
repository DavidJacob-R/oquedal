"use client";

import React, { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function normalizeEmail(e: string) {
  return (e || "").trim().toLowerCase().replace(/\s+/g, "");
}

const emailRegex = /^[^\s@]+@[^\s@]{2,}\.[^\s@]{2,}$/;

function RegistroForm() {
  const searchParams = useSearchParams();

  const next = useMemo(() => {
    const n = searchParams?.get("next") || "/cliente/pedidos";
    return n.startsWith("/") ? n : "/cliente/pedidos";
  }, [searchParams]);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function postJSON(url: string, body: any) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  const registrar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");

    const em = normalizeEmail(email);
    if (!nombre.trim()) return setErr("El nombre es requerido");
    if (!em || !emailRegex.test(em)) return setErr("Email invalido");
    if (!pass || pass.length < 6) return setErr("Contrasena minima 6 caracteres");
    if (pass !== pass2) return setErr("Las contrasenas no coinciden");

    setLoading(true);

    // 1) intenta /api/register; si no existe, usa /api/auth/local/register
    const payload = { nombre, email: em, telefono: tel, password: pass };
    let resp = await postJSON("/api/register", payload);
    if (!resp.ok) {
      resp = await postJSON("/api/auth/local/register", payload);
    }
    if (!resp.ok) {
      setLoading(false);
      return setErr(resp.data?.msg || resp.data?.error || "No se pudo registrar");
    }

    // 2) toma el user_id sin importar la forma que devuelva tu API
    const d = resp.data || {};
    const userId =
      d.user_id || d.user?.id || d.id || d.uid || d.usuario_id || null;

    if (!userId) {
      setLoading(false);
      return setErr("Registro incompleto: falta user_id");
    }

    // 3) setea cookie de sesion (y limpia cualquier admin)
    try {
      document.cookie = `usuario_id=${encodeURIComponent(String(userId))}; Path=/; Max-Age=${
        60 * 60 * 24 * 7
      }; SameSite=Lax`;
      document.cookie = `admin_id=; Path=/; Max-Age=0; SameSite=Lax`;
      try {
        localStorage.setItem("usuario_id", String(userId));
      } catch {}
    } catch {}

    // 4) “calienta” whoami para que el backend cree/ligue el cliente y nombre
    try {
      await fetch("/api/whoami", { cache: "no-store" });
    } catch {}

    setLoading(false);

    // 5) hard navigation para que el primer render ya llegue logeado
    window.location.assign(next);
  };

  return (
    <div className="max-w-sm mx-auto grid gap-4">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}
      <form
        onSubmit={registrar}
        className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
      >
        <input
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2"
          placeholder="nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          type="email"
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2"
          placeholder="telefono (opcional)"
          value={tel}
          onChange={(e) => setTel(e.target.value)}
        />
        <input
          type="password"
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2"
          placeholder="contrasena"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <input
          type="password"
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2"
          placeholder="repite contrasena"
          value={pass2}
          onChange={(e) => setPass2(e.target.value)}
        />
        <button
          disabled={loading}
          className="rounded-xl px-4 py-2 text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
        >
          {loading ? "Creando..." : "Registrarse"}
        </button>
      </form>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <RegistroForm />
    </Suspense>
  );
}
