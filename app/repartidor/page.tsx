"use client";
import { useEffect, useMemo, useState } from "react";

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
  asignado?: boolean;
  asignado_mio?: boolean;
};

function addr(p: Pedido, kind: "origen" | "destino") {
  const dir = (p as any)[`${kind}_direccion`] || "";
  const c = (p as any)[`${kind}_ciudad`] || "";
  const e = (p as any)[`${kind}_estado`] || "";
  const cp = (p as any)[`${kind}_cp`] || "";
  return [dir, c, e, cp].filter(Boolean).join(", ");
}

export default function RepartidorPage() {
  const [rows, setRows] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [scope, setScope] = useState<"todos" | "mios" | "disponibles">("todos");

  async function cargar() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/repartidor/pedidos?scope=${scope}`, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.msg || "No se pudo cargar");
      setRows(Array.isArray(j.rows) ? j.rows : []);
    } catch (e:any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, [scope]);

  const sorted = useMemo(() => {
    return [...rows].sort((a,b) => {
      const af = a.fecha ? new Date(a.fecha).getTime() : Infinity;
      const bf = b.fecha ? new Date(b.fecha).getTime() : Infinity;
      if (af !== bf) return af - bf;
      return (a.folio ?? 0) - (b.folio ?? 0);
    });
  }, [rows]);

  async function marcar(id: string, estado: "completo" | "incompleto") {
    setSavingId(id); setErr(null);
    try {
      const body = estado === "completo" ? { estado } : { estado, motivo: motivo || null, nota: nota || null };
      const r = await fetch(`/api/repartidor/pedidos/${encodeURIComponent(id)}/entrega`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.msg || "No se pudo guardar");
      await cargar();
      setExpandedId(null);
      setMotivo(""); setNota("");
    } catch (e:any) {
      setErr(e?.message || "Error");
    } finally {
      setSavingId(null);
    }
  }

  async function tomar(id: string) {
    setSavingId(id); setErr(null);
    try {
      const r = await fetch(`/api/repartidor/pedidos/${encodeURIComponent(id)}/tomar`, { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.msg || "No se pudo tomar");
      await cargar();
    } catch (e:any) {
      setErr(e?.message || "Error");
    } finally {
      setSavingId(null);
    }
  }

  async function soltar(id: string) {
    setSavingId(id); setErr(null);
    try {
      const r = await fetch(`/api/repartidor/pedidos/${encodeURIComponent(id)}/soltar`, { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.msg || "No se pudo soltar");
      await cargar();
    } catch (e:any) {
      setErr(e?.message || "Error");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-zinc-100">Panel del Repartidor</h1>

        <select
          value={scope}
          onChange={(e)=>setScope(e.target.value as any)}
          className="ml-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 outline-none"
        >
          <option value="todos">Todos</option>
          <option value="mios">Mis asignados</option>
          <option value="disponibles">Disponibles</option>
        </select>
      </div>

      {loading && <p className="text-sm text-zinc-400">Cargando pedidos...</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}
      {!loading && !err && sorted.length === 0 && (
        <p className="text-sm text-zinc-400">No hay pedidos para este filtro.</p>
      )}

      <div className="space-y-3">
        {sorted.map((p) => {
          const origen = addr(p, "origen");
          const destino = addr(p, "destino");
          const fecha = p.fecha ? new Date(p.fecha).toLocaleDateString() : "Sin fecha";
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origen)}&destination=${encodeURIComponent(destino)}&travelmode=driving`;
          const osmUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(origen)}%3B${encodeURIComponent(destino)}`;

          return (
            <div key={p.id} className="rounded-xl border border-zinc-800/70 bg-[#0b0b10]/80 p-4">
              <div className="flex items-center gap-3">
                <div className="min-w-[56px] h-[56px] rounded-lg border border-zinc-800/60 flex items-center justify-center text-zinc-300">
                  <div className="text-center leading-tight">
                    <div className="text-xs text-zinc-400">Folio</div>
                    <div className="font-semibold">{p.folio_str || p.folio || "-"}</div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="text-sm text-zinc-300">
                    <span className="text-zinc-400 mr-1">Fecha:</span>{fecha}
                  </div>
                  <div className="text-sm"><span className="text-zinc-400">Origen:</span> <span className="text-zinc-100">{origen || "-"}</span></div>
                  <div className="text-sm"><span className="text-zinc-400">Destino:</span> <span className="text-zinc-100">{destino || "-"}</span></div>
                  <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                    <span>Contacto:</span>
                    <span className="text-zinc-200">{p.contacto_nombre}</span>
                    <span className="mx-1">•</span>
                    <a className="text-violet-300 hover:underline" href={`tel:${p.contacto_tel}`}>{p.contacto_tel}</a>
                    {p.asignado_mio && (
                      <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-600/30">
                        Asignado a mi
                      </span>
                    )}
                    {!p.asignado_mio && p.asignado && (
                      <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-600/30">
                        Asignado
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a href={mapsUrl} target="_blank" className="inline-flex items-center justify-center rounded-lg border border-emerald-500/40 px-3 py-1.5 text-sm text-emerald-300 hover:border-emerald-400/70">Ruta (Maps)</a>
                  <a href={osmUrl} target="_blank" className="inline-flex items-center justify-center rounded-lg border border-blue-500/40 px-3 py-1.5 text-sm text-blue-300 hover:border-blue-400/70">Ruta (OSM)</a>

                  {!p.asignado && (
                    <button
                      onClick={() => tomar(p.id)}
                      disabled={savingId === p.id}
                      className="inline-flex items-center justify-center rounded-lg border border-violet-500/40 px-3 py-1.5 text-sm text-violet-200 hover:border-violet-400/70 disabled:opacity-60"
                    >
                      {savingId === p.id ? "Tomando..." : "Tomar"}
                    </button>
                  )}
                  {p.asignado_mio && (
                    <button
                      onClick={() => soltar(p.id)}
                      disabled={savingId === p.id}
                      className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
                    >
                      {savingId === p.id ? "Soltando..." : "Soltar"}
                    </button>
                  )}

                  <button
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-500"
                  >
                    {expandedId === p.id ? "Cerrar" : "Actualizar"}
                  </button>
                </div>
              </div>

              {expandedId === p.id && (
                <div className="mt-4 border-t border-zinc-800 pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => marcar(p.id, "completo")}
                      disabled={savingId === p.id || !p.asignado_mio}
                      title={!p.asignado_mio ? "Debes tomar el pedido antes" : ""}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-200 hover:border-emerald-400/70 disabled:opacity-60"
                    >
                      {savingId === p.id ? "Guardando..." : "Marcar COMPLETO"}
                    </button>

                    <details className="group">
                      <summary className="list-none rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200 hover:border-amber-400/70 cursor-pointer">
                        Marcar INCOMPLETO
                      </summary>
                      <div className="mt-3 p-3 rounded-lg border border-zinc-800">
                        <label className="block text-sm text-zinc-300 mb-1">Motivo</label>
                        <select value={motivo} onChange={(e)=>setMotivo(e.target.value)}
                          className="w-full mb-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500"
                        >
                          <option value="">Selecciona un motivo</option>
                          <option>No estaba el cliente</option>
                          <option>Dirección incorrecta</option>
                          <option>Acceso restringido</option>
                          <option>Condiciones de tráfico/clima</option>
                          <option>Otro</option>
                        </select>
                        <label className="block text-sm text-zinc-300 mb-1">Nota</label>
                        <textarea value={nota} onChange={(e)=>setNota(e.target.value)} rows={3}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500"
                          placeholder="Detalle opcional"></textarea>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => marcar(p.id, "incompleto")}
                            disabled={savingId === p.id || !p.asignado_mio}
                            title={!p.asignado_mio ? "Debes tomar el pedido antes" : ""}
                            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200 hover:border-amber-400/70 disabled:opacity-60"
                          >
                            {savingId === p.id ? "Guardando..." : "Guardar como INCOMPLETO"}
                          </button>
                          <button
                            onClick={() => { setMotivo(""); setNota(""); }}
                            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-500"
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
