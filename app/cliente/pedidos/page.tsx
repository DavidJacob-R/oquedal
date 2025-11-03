"use client";
import { useState } from "react";

const inputBase = "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2";
const cardBase  = "grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4";

export default function RegistrarPedidoPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    tipo: "mudanza" as "mudanza" | "envio",
    fecha: new Date().toISOString().slice(0, 10),
    franja_horaria: "",
    origen_direccion: "",
    origen_ciudad: "",
    origen_estado: "",
    origen_cp: "",
    destino_direccion: "",
    destino_ciudad: "",
    destino_estado: "",
    destino_cp: "",
    contacto_nombre: "",
    contacto_tel: "",
    descripcion: "",
    volumen_m3: "" as string | number,
    peso_kg: "" as string | number,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (!form.tipo || !form.fecha || !form.origen_direccion || !form.destino_direccion || !form.contacto_nombre || !form.contacto_tel) {
      setErr("Faltan datos obligatorios");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tipo: form.tipo,
          fecha: form.fecha,
          franja_horaria: form.franja_horaria || null,
          origen_direccion: form.origen_direccion,
          origen_ciudad: form.origen_ciudad || null,
          origen_estado: form.origen_estado || null,
          origen_cp: form.origen_cp || null,
          destino_direccion: form.destino_direccion,
          destino_ciudad: form.destino_ciudad || null,
          destino_estado: form.destino_estado || null,
          destino_cp: form.destino_cp || null,
          contacto_nombre: form.contacto_nombre,
          contacto_tel: form.contacto_tel,
          descripcion: form.descripcion || null,
          volumen_m3: form.volumen_m3 || null,
          peso_kg: form.peso_kg || null,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "no_ok");
      setMsg("Pedido creado correctamente");
      // limpiar campos (menos tipo/fecha)
      setForm(f => ({
        ...f,
        franja_horaria: "",
        origen_direccion: "",
        origen_ciudad: "",
        origen_estado: "",
        origen_cp: "",
        destino_direccion: "",
        destino_ciudad: "",
        destino_estado: "",
        destino_cp: "",
        contacto_nombre: "",
        contacto_tel: "",
        descripcion: "",
        volumen_m3: "",
        peso_kg: "",
      }));
    } catch {
      setErr("No se pudo crear el pedido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto grid gap-4">
      <h1 className="text-2xl font-semibold">Registrar pedido</h1>

      {msg && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{msg}</div>}
      {err && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</div>}

      <form onSubmit={onSubmit} className={cardBase}>
        <div className="grid sm:grid-cols-2 gap-3">
          <select
            className={inputBase}
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as "mudanza" | "envio" })}
          >
            <option value="mudanza">mudanza</option>
            <option value="envio">envio</option>
          </select>

          <input
            type="date"
            className={inputBase}
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          />
        </div>

        <input className={inputBase} placeholder="franja_horaria (opcional)" value={form.franja_horaria} onChange={(e)=>setForm({...form, franja_horaria: e.target.value})} />

        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inputBase} placeholder="origen_direccion" value={form.origen_direccion} onChange={(e)=>setForm({...form, origen_direccion: e.target.value})} />
          <input className={inputBase} placeholder="destino_direccion" value={form.destino_direccion} onChange={(e)=>setForm({...form, destino_direccion: e.target.value})} />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <input className={inputBase} placeholder="origen_ciudad" value={form.origen_ciudad} onChange={(e)=>setForm({...form, origen_ciudad: e.target.value})} />
          <input className={inputBase} placeholder="origen_estado" value={form.origen_estado} onChange={(e)=>setForm({...form, origen_estado: e.target.value})} />
          <input className={inputBase} placeholder="origen_cp" value={form.origen_cp} onChange={(e)=>setForm({...form, origen_cp: e.target.value})} />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <input className={inputBase} placeholder="destino_ciudad" value={form.destino_ciudad} onChange={(e)=>setForm({...form, destino_ciudad: e.target.value})} />
          <input className={inputBase} placeholder="destino_estado" value={form.destino_estado} onChange={(e)=>setForm({...form, destino_estado: e.target.value})} />
          <input className={inputBase} placeholder="destino_cp" value={form.destino_cp} onChange={(e)=>setForm({...form, destino_cp: e.target.value})} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inputBase} placeholder="contacto_nombre" value={form.contacto_nombre} onChange={(e)=>setForm({...form, contacto_nombre: e.target.value})} />
          <input className={inputBase} placeholder="contacto_tel" value={form.contacto_tel} onChange={(e)=>setForm({...form, contacto_tel: e.target.value})} />
        </div>

        <textarea className={inputBase} placeholder="descripcion" value={form.descripcion} onChange={(e)=>setForm({...form, descripcion: e.target.value})} />

        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inputBase} type="number" step="0.01" placeholder="volumen_m3 (opcional)" value={form.volumen_m3} onChange={(e)=>setForm({...form, volumen_m3: e.target.value})} />
          <input className={inputBase} type="number" step="0.01" placeholder="peso_kg (opcional)" value={form.peso_kg} onChange={(e)=>setForm({...form, peso_kg: e.target.value})} />
        </div>

        <button
          disabled={loading}
          className="inline-flex items-center rounded-xl px-5 py-2.5 font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60"
        >
          {loading ? "Creando..." : "Crear pedido"}
        </button>
      </form>
    </div>
  );
}
