"use client";
import { useMemo, useState } from "react";

const inputBase = "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2";
const cardBase  = "grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4";

export default function RegistrarPedidoPage() {
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

  const canCreate = useMemo(() => {
    return !!(
      form.tipo &&
      form.fecha &&
      form.origen_direccion &&
      form.destino_direccion &&
      form.contacto_nombre &&
      form.contacto_tel
    );
  }, [form]);

  async function buildHeaders(): Promise<HeadersInit> {
    const headers: Record<string,string> = { "content-type": "application/json" };
    const uid = localStorage.getItem("usuario_id") || "";
    if (uid) headers["x-usuario-id"] = uid;
    return headers;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    try {
      const headers = await buildHeaders();
      const body = {
        ...form,
        franja_horaria: form.franja_horaria || null,
        origen_ciudad: form.origen_ciudad || null,
        origen_estado: form.origen_estado || null,
        origen_cp: form.origen_cp || null,
        destino_ciudad: form.destino_ciudad || null,
        destino_estado: form.destino_estado || null,
        destino_cp: form.destino_cp || null,
        descripcion: form.descripcion || null,
        volumen_m3: form.volumen_m3 === "" ? null : Number(form.volumen_m3),
        peso_kg: form.peso_kg === "" ? null : Number(form.peso_kg),
      };

      const r = await fetch("/api/pedidos", { method: "POST", headers, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "no_ok");

      // limpiar
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

      alert("Pedido registrado. Quedó en estado 'pendiente'.");
    } catch (err) {
      console.error(err);
      alert("No se pudo registrar el pedido");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 grid gap-8">
      <h1 className="text-2xl font-semibold">Registrar pedido</h1>

      <form onSubmit={onCreate} className={cardBase}>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400">Tipo</label>
            <select
              value={form.tipo}
              onChange={e=>setForm(f=>({ ...f, tipo: e.target.value as any }))}
              className={inputBase}
            >
              <option value="mudanza">mudanza</option>
              <option value="envio">envio</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400">Fecha</label>
            <input type="date" value={form.fecha} onChange={e=>setForm(f=>({ ...f, fecha: e.target.value }))} className={inputBase} />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs text-zinc-400">Franja horaria</label>
            <input value={form.franja_horaria} onChange={e=>setForm(f=>({ ...f, franja_horaria: e.target.value }))} className={inputBase} placeholder="09:00-12:00" />
          </div>

          <div className="sm:col-span-2 font-semibold">Origen</div>
          <div className="sm:col-span-2">
            <label className="text-xs text-zinc-400">Dirección</label>
            <input value={form.origen_direccion} onChange={e=>setForm(f=>({ ...f, origen_direccion: e.target.value }))} className={inputBase} required />
          </div>
          <div><input placeholder="Ciudad" className={inputBase} value={form.origen_ciudad} onChange={e=>setForm(f=>({ ...f, origen_ciudad: e.target.value }))} /></div>
          <div><input placeholder="Estado" className={inputBase} value={form.origen_estado} onChange={e=>setForm(f=>({ ...f, origen_estado: e.target.value }))} /></div>
          <div><input placeholder="CP" className={inputBase} value={form.origen_cp} onChange={e=>setForm(f=>({ ...f, origen_cp: e.target.value }))} /></div>

          <div className="sm:col-span-2 font-semibold">Destino</div>
          <div className="sm:col-span-2">
            <label className="text-xs text-zinc-400">Dirección</label>
            <input value={form.destino_direccion} onChange={e=>setForm(f=>({ ...f, destino_direccion: e.target.value }))} className={inputBase} required />
          </div>
          <div><input placeholder="Ciudad" className={inputBase} value={form.destino_ciudad} onChange={e=>setForm(f=>({ ...f, destino_ciudad: e.target.value }))} /></div>
          <div><input placeholder="Estado" className={inputBase} value={form.destino_estado} onChange={e=>setForm(f=>({ ...f, destino_estado: e.target.value }))} /></div>
          <div><input placeholder="CP" className={inputBase} value={form.destino_cp} onChange={e=>setForm(f=>({ ...f, destino_cp: e.target.value }))} /></div>

          <div>
            <label className="text-xs text-zinc-400">Contacto nombre</label>
            <input value={form.contacto_nombre} onChange={e=>setForm(f=>({ ...f, contacto_nombre: e.target.value }))} className={inputBase} required />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Contacto tel</label>
            <input value={form.contacto_tel} onChange={e=>setForm(f=>({ ...f, contacto_tel: e.target.value }))} className={inputBase} required />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs text-zinc-400">Descripción</label>
            <textarea value={form.descripcion} onChange={e=>setForm(f=>({ ...f, descripcion: e.target.value }))} className={inputBase} rows={3} />
          </div>

          <div><input type="number" step="any" placeholder="Volumen (m³)" className={inputBase} value={form.volumen_m3} onChange={e=>setForm(f=>({ ...f, volumen_m3: e.target.value }))} /></div>
          <div><input type="number" step="any" placeholder="Peso (kg)"   className={inputBase} value={form.peso_kg} onChange={e=>setForm(f=>({ ...f, peso_kg: e.target.value }))} /></div>
        </div>

        <div>
          <button disabled={!canCreate} className="rounded-xl px-4 py-2 bg-white text-black disabled:opacity-50">
            Guardar pedido
          </button>
        </div>
      </form>
    </div>
  );
}
