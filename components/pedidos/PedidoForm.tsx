"use client";
import { useState } from "react";

export type Pedido = {
  id?: string;
  tipo: "mudanza" | "envio";
  fecha: string;
  franja_horaria?: string;
  origen_direccion: string;
  origen_ciudad?: string;
  origen_estado?: string;
  origen_cp?: string;
  destino_direccion: string;
  destino_ciudad?: string;
  destino_estado?: string;
  destino_cp?: string;
  contacto_nombre: string;
  contacto_tel: string;
  descripcion?: string;
  volumen_m3?: number | string;
  peso_kg?: number | string;
};

type Props = { initial?: Partial<Pedido>; onSaved?: (p?: any) => void; headers?: HeadersInit; };

function Title({ children }: { children: React.ReactNode }) {
  return (<div className="flex items-center gap-2 mb-2"><div className="h-5 w-1 rounded bg-violet-500"></div><h3 className="text-sm font-semibold text-zinc-200 tracking-wide">{children}</h3></div>);
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (<input {...props} className={"w-full rounded-xl border bg-zinc-950/60 px-3 py-2 text-zinc-100 placeholder-zinc-500 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 "+(props.className||"")} />);
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (<textarea {...props} className={"w-full rounded-xl border bg-zinc-950/60 px-3 py-2 text-zinc-100 placeholder-zinc-500 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 "+(props.className||"")} rows={4} />);
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (<select {...props} className={"w-full rounded-xl border bg-zinc-950/60 px-3 py-2 text-zinc-100 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 "+(props.className||"")} />);
}

export default function PedidoForm({ initial = {}, onSaved, headers }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [form, setForm] = useState<Pedido>({
    id: initial.id, tipo: (initial.tipo as any) || "mudanza", fecha: initial.fecha || "",
    franja_horaria: initial.franja_horaria || "", origen_direccion: initial.origen_direccion || "",
    origen_ciudad: initial.origen_ciudad || "", origen_estado: initial.origen_estado || "", origen_cp: initial.origen_cp || "",
    destino_direccion: initial.destino_direccion || "", destino_ciudad: initial.destino_ciudad || "",
    destino_estado: initial.destino_estado || "", destino_cp: initial.destino_cp || "",
    contacto_nombre: initial.contacto_nombre || "", contacto_tel: initial.contacto_tel || "",
    descripcion: initial.descripcion || "", volumen_m3: initial.volumen_m3 || "", peso_kg: initial.peso_kg || ""
  });

  function validar(): string | null {
    if (!form.fecha) return "la fecha es requerida";
    if (!form.origen_direccion) return "la direccion de origen es requerida";
    if (!form.destino_direccion) return "la direccion de destino es requerida";
    if (!form.contacto_nombre) return "el nombre de contacto es requerido";
    if (!form.contacto_tel) return "el telefono de contacto es requerido";
    return null;
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const v = validar();
    if (v) { setErrorMsg(v); return; }
    setLoading(true);
    const isEdit = Boolean(form.id);
    const url = isEdit ? `/api/pedidos/${form.id}` : "/api/pedidos";
    const method = isEdit ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, body: JSON.stringify(form), headers: { "content-type": "application/json", ...(headers || {}) } });
      const payload = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) { setErrorMsg(payload?.error || "error al guardar"); return; }
      if (onSaved) onSaved(payload);
    } catch (err: any) { setLoading(false); setErrorMsg(err?.message || "error de red"); }
  };

  return (
    <form onSubmit={save} className="grid gap-6 p-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">pedido</h2>
        <span className="inline-flex items-center rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
          {form.id ? "editar" : "nuevo"}
        </span>
      </div>

      {errorMsg && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{errorMsg}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1 text-sm text-zinc-300">tipo
          <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}>
            <option value="mudanza">mudanza</option>
            <option value="envio">envio</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm text-zinc-300">fecha
          <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}/>
        </label>
        <label className="grid gap-1 text-sm text-zinc-300">franja_horaria
          <Input placeholder="9-12, 12-15..." value={form.franja_horaria || ""} onChange={(e) => setForm({ ...form, franja_horaria: e.target.value })}/>
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Title>origen</Title>
          <div className="grid gap-3">
            <Input placeholder="direccion" value={form.origen_direccion} onChange={(e) => setForm({ ...form, origen_direccion: e.target.value })}/>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="ciudad" value={form.origen_ciudad || ""} onChange={(e) => setForm({ ...form, origen_ciudad: e.target.value })}/>
              <Input placeholder="estado" value={form.origen_estado || ""} onChange={(e) => setForm({ ...form, origen_estado: e.target.value })}/>
              <Input placeholder="cp" value={form.origen_cp || ""} onChange={(e) => setForm({ ...form, origen_cp: e.target.value })}/>
            </div>
          </div>
        </div>
        <div>
          <Title>destino</Title>
          <div className="grid gap-3">
            <Input placeholder="direccion" value={form.destino_direccion} onChange={(e) => setForm({ ...form, destino_direccion: e.target.value })}/>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="ciudad" value={form.destino_ciudad || ""} onChange={(e) => setForm({ ...form, destino_ciudad: e.target.value })}/>
              <Input placeholder="estado" value={form.destino_estado || ""} onChange={(e) => setForm({ ...form, destino_estado: e.target.value })}/>
              <Input placeholder="cp" value={form.destino_cp || ""} onChange={(e) => setForm({ ...form, destino_cp: e.target.value })}/>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="contacto_nombre" value={form.contacto_nombre} onChange={(e) => setForm({ ...form, contacto_nombre: e.target.value })}/>
        <Input placeholder="contacto_tel" value={form.contacto_tel} onChange={(e) => setForm({ ...form, contacto_tel: e.target.value })}/>
      </div>

      <Textarea placeholder="descripcion" value={form.descripcion || ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}/>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="volumen_m3" type="number" step="0.01" value={form.volumen_m3 as any} onChange={(e) => setForm({ ...form, volumen_m3: e.target.value })}/>
        <Input placeholder="peso_kg" type="number" step="0.01" value={form.peso_kg as any} onChange={(e) => setForm({ ...form, peso_kg: e.target.value })}/>
      </div>

      <button disabled={loading} className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60 shadow-lg shadow-violet-900/30">
        {form.id ? (loading ? "guardando..." : "guardar cambios") : (loading ? "creando..." : "crear pedido")}
      </button>
    </form>
  );
}
