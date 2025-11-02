"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/local/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setErr(j?.msg || "No se pudo iniciar sesión");
        setLoading(false);
        return;
      }

      // setear localStorage para que el NavBar lo detecte también
      try {
        if (j.user?.rol === "admin") {
          localStorage.setItem("admin_id", j.user.id);
          localStorage.removeItem("usuario_id");
        } else {
          localStorage.setItem("usuario_id", j.user.id);
          localStorage.removeItem("admin_id");
        }
      } catch {}

      window.location.href = j.redirect || (j.user?.rol === "admin" ? "/admin/panel" : "/cliente/pedidos");
    } catch {
      setErr("Error de red");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-800/60 bg-[#0b0b10]/80 p-6 shadow-xl backdrop-blur"
      >
        <h1 className="text-xl font-semibold text-zinc-100 mb-4">Iniciar sesión</h1>

        <label className="block text-sm text-zinc-300 mb-1">Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-violet-500"
          required
        />

        <label className="block text-sm text-zinc-300 mb-1">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-violet-500"
          required
        />

        {err && <p className="mb-3 text-sm text-red-400">{err}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-sm font-medium text-white hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
