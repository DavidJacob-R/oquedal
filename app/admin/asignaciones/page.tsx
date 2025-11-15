"use client";
import { useEffect, useMemo, useState } from "react";

type Repartidor = { id: string; nombre: string | null; email: string | null; };
type Pedido = {
  id: string;
  folio: number | null;
  folio_str: string | null;
  fecha: string | null;
  created_at: string | null;
  origen_direccion: string | null;
  origen_ciudad: string | null;
  origen_estado: string | null;
  origen_cp: string | null;
  destino_direccion: string | null;
  destino_ciudad: string | null;
  destino_estado: string | null;
  destino_cp: string | null;
  contacto_nombre: string | null;
  contacto_tel: string | null;
  repartidor_id: string | null;
  repartidor_nombre: string | null;
  repartidor_email: string | null;
};

export default function AdminAsignacionesPage() {
  const [reps, setReps] = useState<Repartidor[]>([]);
  const [rows, setRows] = useState<Pedido[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "asignados" | "disponibles">("todos");
  const [seleccion, setSeleccion] = useState<Record<string, string>>({}); // pedidoId -> repartidorId

  async function cargar() {
    setLoading(true); setErr(null);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/admin/repartidores", { cache: "no-store" }),
        fetch("/api/admin/pedidos/confirmados", { cache: "no-store" }),
      ]);
      const j1 = await r1.json(); const j2 = await r2.json();
      if (!j1.ok) throw new Error(j1.msg || "No se pudo cargar repartidores");
      if (!j2.ok) throw new Error(j2.msg || "No se pudo cargar pedidos");
      setReps(j1.rows || []);
      setRows(j2.rows || []);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => {
    let data = [...rows];
    if (filtro === "asignados") data = data.filter(p => !!p.repartidor_id);
    if (filtro === "disponibles") data = data.filter(p => !p.repartidor_id);
    return data.sort((a, b) => {
      const af = a.fecha ? new Date(a.fecha).getTime() : Infinity;
      const bf = b.fecha ? new Date(b.fecha).getTime() : Infinity;
      if (af !== bf) return af - bf;
      return (a.folio ?? 0) - (b.folio ?? 0);
    });
  }, [rows, filtro]);

  function addr(p: Pedido, k: "origen"|"destino") {
    return [
      (p as any)[`${k}_direccion`],
      (p as any)[`${k}_ciudad`],
      (p as any)[`${k}_estado`],
      (p as any)[`${k}_cp`],
    ].filter(Boolean).join(", ") || "-";
  }

  async function asignar(pedidoId: string) {
    setSaving(pedidoId); setErr(null);
    try {
      const repartidorId = seleccion[pedidoId] || "";
      if (!repartidorId) throw new Error("Selecciona un repartidor");
      const r = await fetch(`/api/admin/pedidos/${encodeURIComponent(pedidoId)}/asignar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repartidor_id: repartidorId }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.msg || "No se pudo asignar");
      await cargar();
    } catch (e:any) {
      setErr(e?.message || "Error");
    } finally {
      setSaving(null);
    }
  }

  async function liberar(pedidoId: string) {
    setSaving(pedidoId); setErr(null);
    try {
      const r = await fetch(`/api/admin/pedidos/${encodeURIComponent(pedidoId)}/liberar`, { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.msg || "No se pudo liberar");
      await cargar();
    } catch (e:any) {
      setErr(e?.message || "Error");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Asignaciones</h1>
        <select
          value={filtro}
          onChange={(e)=>setFiltro(e.target.value as any)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 outline-none"
        >
          <option value="todos">Todos</option>
          <option value="asignados">Asignados</option>
          <option value="disponibles">Disponibles</option>
        </select>
      </div>

      {loading && <p className="text-sm text-zinc-400">Cargando...</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {!loading && !err && (
        <div className="space-y-3">
          {filtrados.map((p) => {
            const origen = addr(p, "origen");
            const destino = addr(p, "destino");
            const fecha = p.fecha ? new Date(p.fecha).toLocaleDateString() : "Sin fecha";
            const sel = seleccion[p.id] ?? p.repartidor_id ?? "";

            return (
              <div key={p.id} className="rounded-xl border border-zinc-800 bg-[#0b0b10]/80 p-4">
                <div className="flex items-start gap-4">
                  <div className="min-w-[64px] h-[64px] rounded-lg border border-zinc-800/60 flex items-center justify-center text-zinc-300">
                    <div className="text-center leading-tight">
                      <div className="text-[11px] text-zinc-400">Folio</div>
                      <div className="font-semibold">{p.folio_str || p.folio || "-"}</div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="text-sm text-zinc-300">
                      <span className="text-zinc-400 mr-1">Fecha:</span>{fecha}
                    </div>
                    <div className="text-sm"><span className="text-zinc-400">Origen:</span> <span className="text-zinc-100">{origen}</span></div>
                    <div className="text-sm"><span className="text-zinc-400">Destino:</span> <span className="text-zinc-100">{destino}</span></div>
                    <div className="text-xs text-zinc-400 mt-1">
                      <span className="mr-2">Contacto:</span>
                      <span className="text-zinc-200">{p.contacto_nombre}</span>
                      <span className="mx-2">•</span>
                      <a className="text-violet-300 hover:underline" href={`tel:${p.contacto_tel}`}>{p.contacto_tel}</a>
                    </div>
                  </div>

                  <div className="min-w-[320px] flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={sel}
                        onChange={(e)=>setSeleccion(s => ({ ...s, [p.id]: e.target.value }))}
                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                      >
                        <option value="">Selecciona repartidor</option>
                        {reps.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.nombre || r.email} {r.email && r.nombre ? `· ${r.email}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => asignar(p.id)}
                        disabled={saving === p.id || !(seleccion[p.id] || p.repartidor_id)}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 hover:border-emerald-400/70 disabled:opacity-60"
                        title={!sel && !p.repartidor_id ? "Selecciona un repartidor" : ""}
                      >
                        {saving === p.id ? "Guardando..." : "Asignar"}
                      </button>
                    </div>

                    {p.repartidor_id && (
                      <div className="text-xs text-zinc-400">
                        Actual: <span className="text-zinc-200">{p.repartidor_nombre || p.repartidor_email}</span>
                      </div>
                    )}

                    {p.repartidor_id && (
                      <button
                        onClick={() => liberar(p.id)}
                        disabled={saving === p.id}
                        className="self-start rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
                      >
                        {saving === p.id ? "Liberando..." : "Liberar"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filtrados.length === 0 && (
            <div className="text-sm text-zinc-500">No hay pedidos para este filtro.</div>
          )}
        </div>
      )}
    </div>
  );
}
