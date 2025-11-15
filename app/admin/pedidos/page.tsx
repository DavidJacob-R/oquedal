"use client";
import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  folio: number | null;
  folio_str: string | null;
  fecha: string | null;
  estado: string;
  estado_entrega: "pendiente" | "completo" | "incompleto";
  created_at: string | null;
  origen_direccion: string | null; origen_ciudad: string | null; origen_estado: string | null; origen_cp: string | null;
  destino_direccion: string | null; destino_ciudad: string | null; destino_estado: string | null; destino_cp: string | null;
  contacto_nombre: string | null; contacto_tel: string | null;
  repartidor_id: string | null;
  repartidor_nombre: string | null;
};

export default function AdminPedidosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [estado, setEstado] = useState<string>("");
  const [ee, setEe] = useState<string>("");
  const [fmin, setFmin] = useState<string>("");
  const [fmax, setFmax] = useState<string>("");

  function addr(r: Row, k: "origen"|"destino") {
    return [
      (r as any)[`${k}_direccion`],
      (r as any)[`${k}_ciudad`],
      (r as any)[`${k}_estado`],
      (r as any)[`${k}_cp`],
    ].filter(Boolean).join(", ") || "-";
  }

  async function cargar() {
    setLoading(true); setErr(null);
    try {
      const sp = new URLSearchParams();
      if (estado) sp.set("estado", estado);
      if (ee) sp.set("ee", ee);
      if (fmin) sp.set("fecha_min", fmin);
      if (fmax) sp.set("fecha_max", fmax);

      const r = await fetch(`/api/admin/pedidos/listado?${sp.toString()}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.msg || "No se pudo cargar");
      setRows(Array.isArray(j.rows) ? j.rows : []);
    } catch (e:any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ cargar(); }, []); // primera carga

  const sorted = useMemo(() => {
    return [...rows].sort((a,b) => {
      const af = a.fecha ? new Date(a.fecha).getTime() : Infinity;
      const bf = b.fecha ? new Date(b.fecha).getTime() : Infinity;
      if (af !== bf) return af - bf;
      return (a.folio ?? 0) - (b.folio ?? 0);
    });
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Pedidos</h1>
        <p className="text-sm text-zinc-400">Listado general con filtros.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-zinc-400 mb-1">Estado</label>
          <select value={estado} onChange={(e)=>setEstado(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none">
            <option value="">(todos)</option>
            <option value="borrador">borrador</option>
            <option value="pendiente">pendiente</option>
            <option value="confirmado">confirmado</option>
            <option value="cancelado">cancelado</option>
            <option value="completado">completado</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-zinc-400 mb-1">Estado de entrega</label>
          <select value={ee} onChange={(e)=>setEe(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none">
            <option value="">(todos)</option>
            <option value="pendiente">pendiente</option>
            <option value="completo">completo</option>
            <option value="incompleto">incompleto</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-zinc-400 mb-1">Fecha min</label>
          <input type="date" value={fmin} onChange={(e)=>setFmin(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"/>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-zinc-400 mb-1">Fecha max</label>
          <input type="date" value={fmax} onChange={(e)=>setFmax(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"/>
        </div>

        <button
          onClick={cargar}
          className="h-[38px] rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 text-sm text-violet-200 hover:border-violet-400/70"
        >
          Aplicar filtros
        </button>
      </div>

      {loading && <p className="text-sm text-zinc-400">Cargando...</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {!loading && !err && (
        <div className="space-y-3">
          {sorted.map((p)=>(
            <div key={p.id} className="rounded-xl border border-zinc-800 bg-[#0b0b10]/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-zinc-200">
                  <span className="text-zinc-400 mr-2">Folio</span>
                  <span className="font-semibold">{p.folio_str || p.folio || "-"}</span>
                  <span className="mx-3 text-zinc-500">•</span>
                  <span className="text-zinc-400 mr-2">Fecha</span>
                  <span>{p.fecha ? new Date(p.fecha).toLocaleDateString() : "Sin fecha"}</span>
                </div>
                <div className="text-xs text-zinc-400">
                  <span className="mr-3">Estado: <span className="text-zinc-200">{p.estado}</span></span>
                  <span>Entrega: <span className="text-zinc-200">{p.estado_entrega}</span></span>
                </div>
              </div>

              <div className="mt-2 grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div><span className="text-zinc-400">Origen:</span> <span className="text-zinc-100">{addr(p,"origen")}</span></div>
                  <div><span className="text-zinc-400">Destino:</span> <span className="text-zinc-100">{addr(p,"destino")}</span></div>
                </div>
                <div className="text-xs text-zinc-400">
                  <div>Contacto: <span className="text-zinc-200">{p.contacto_nombre}</span></div>
                  <div>Telefono: <a className="text-violet-300 hover:underline" href={`tel:${p.contacto_tel}`}>{p.contacto_tel}</a></div>
                  <div>Repartidor: <span className="text-zinc-200">{p.repartidor_nombre || "-"}</span></div>
                </div>
              </div>
            </div>
          ))}
          {sorted.length === 0 && <div className="text-sm text-zinc-500">Sin resultados</div>}
        </div>
      )}
    </div>
  );
}
