"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function normalizeEmail(e: string) { return (e || "").trim().toLowerCase().replace(/\s+/g, ""); }
const emailRegex = /^[^\s@]+@[^\s@]{2,}\.[^\s@]{2,}$/;

export default function RegistroPage() {
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

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const em = normalizeEmail(email);
    if (!nombre.trim()) return setErr("El nombre es requerido");
    if (!em || !emailRegex.test(em)) return setErr("Email inválido");
    if (!pass || pass.length < 6) return setErr("Contraseña mínima 6 caracteres");
    if (pass !== pass2) return setErr("Las contraseñas no coinciden");

    setLoading(true);
    const res = await fetch("/api/auth/local/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre, email: em, telefono: tel, password: pass }),
    });
    setLoading(false);

    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(j?.error || "No se pudo registrar");

    // guarda sesión local
    try {
      localStorage.setItem("usuario_id", j.user_id);
      document.cookie = `usuario_id=${j.user_id}; path=/; max-age=31536000; samesite=lax`;
    } catch {}

    window.location.href = next;
  };

  return (
    <div className="max-w-sm mx-auto grid gap-4">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      {err && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</div>}
      <form onSubmit={registrar} className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <input className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2" placeholder="nombre completo" value={nombre} onChange={(e)=>setNombre(e.target.value)} />
        <input type="email" className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2" placeholder="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2" placeholder="teléfono (opcional)" value={tel} onChange={(e)=>setTel(e.target.value)} />
        <input type="password" className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2" placeholder="contraseña" value={pass} onChange={(e)=>setPass(e.target.value)} />
        <input type="password" className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2" placeholder="repite contraseña" value={pass2} onChange={(e)=>setPass2(e.target.value)} />
        <button disabled={loading} className="rounded-xl px-4 py-2 text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500">
          {loading ? "Creando..." : "Registrarse"}
        </button>
      </form>
    </div>
  );
}
