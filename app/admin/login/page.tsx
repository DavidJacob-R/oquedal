"use client";
import { useState } from "react";

const inputBase = "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data?.error || "No se pudo iniciar sesión");
        return;
      }
      localStorage.setItem("admin_id", data.admin_id);
      window.location.href = "/admin/panel";
    } catch {
      setErr("No se pudo iniciar sesión");
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 grid gap-4">
      <h1 className="text-2xl font-semibold">Admin · Iniciar sesión</h1>
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div>
          <label className="text-xs text-zinc-400">Email</label>
          <input className={inputBase} value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-zinc-400">Password</label>
          <input type="password" className={inputBase} value={password} onChange={e=>setPass(e.target.value)} />
        </div>
        {err && <div className="text-sm text-red-300">{err}</div>}
        <button className="rounded-xl px-4 py-2 bg-white text-black">Entrar</button>
      </form>
    </div>
  );
}
