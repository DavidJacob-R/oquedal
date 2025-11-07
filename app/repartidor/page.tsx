"use client";
import { useEffect, useMemo, useState } from "react";

type Pedido = {
  id: string;
  folio?: number | null;
  folio_str?: string | null;
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
};

type ApiRow = Pedido & {
  origen: string | null;
  destino: string | null;
};

type EntregaEstado = "completo" | "incompleto";

function addrStr(
  d: { origen_direccion?: string|null; origen_ciudad?: string|null; origen_estado?: string|null; origen_cp?: string|null } |
     { destino_direccion?: string|null; destino_ciudad?: string|null; destino_estado?: string|null; destino_cp?: string|null },
  kind: "origen" | "destino"
) {
  const dir = (d as any)[`${kind}_direccion`] || "";
  const ciudad = (d as any)[`${kind}_ciudad`] || "";
  const estado = (d as any)[`${kind}_estado`] || "";
  const cp = (d as any)[`${kind}_cp`] || "";
  return [dir, ciudad, estado, cp].filter(Boolean).join(", ");
}

async function geocode(q: string): Promise<{lat:number, lon:number} | null> {
  const key = "geo:"+q.toLowerCase();
  try {
    const cached = localStorage.getItem(key);
    if (cached) { const obj = JSON.parse(cached); if (obj && obj.lat && obj.lon) return obj; }
  } catch {}
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&email=oquedal.app%40example.com&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    const j = await r.json();
    if (Array.isArray(j) && j[0] && j[0].lat && j[0].lon) {
      const obj = { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon) };
      try { localStorage.setItem(key, JSON.stringify(obj)); } catch {}
      return obj;
    }
  } catch {}
  return null;
}

function haversine(a: {lat:number, lon:number}, b: {lat:number, lon:number}) {
  const R = 6371; // km
  const dLat = (b.lat - a.lat) * Math.PI/180;
  const dLon = (b.lon - a.lon) * Math.PI/180;
  const la1 = a.lat * Math.PI/180;
  const la2 = b.lat * Math.PI/180;
  const sinDLat = Math.sin(dLat/2);
  const sinDLon = Math.sin(dLon/2);
  const x = sinDLat*sinDLat + Math.cos(la1)*Math.cos(la2)*sinDLon*sinDLon;
  const c = 2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  return R*c;
}

export default function RepartidorPage() {
  const [rows, setRows] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [routeScores, setRouteScores] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [motivo, setMotivo] = useState<string>("");
  const [nota, setNota] = useState<string>("");
  const [savingId, setSavingId] = useState<string|null>(null);

  async function cargar() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/repartidor/pedidos", { cache: "no-store" });
      if (r.status === 401) { window.location.href = "/login"; return; }
      const j = await r.json();
      if (!j.ok) throw new Error(j.msg || "No se pudo cargar");
      setRows(Array.isArray(j.rows) ? j.rows : []);
    } catch (e:any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const sorted = useMemo(() => {
    const byFecha = [...rows].sort((a,b) => {
      const af = a.fecha ? new Date(a.fecha).getTime() : Infinity;
      const bf = b.fecha ? new Date(b.fecha).getTime() : Infinity;
      if (af !== bf) return af - bf;
      const as = routeScores[a.id] ?? Infinity;
      const bs = routeScores[b.id] ?? Infinity;
      if (as !== bs) return as - bs;
      return (a.folio ?? 0) - (b.folio ?? 0);
    });
    return byFecha;
  }, [rows, routeScores]);

  async function optimizarPorRuta() {
    setOptimizing(true); setErr(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error("El navegador no permite geolocalización")); return; }
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 });
      }).catch(() => null as any);

      const current = pos ? { lat: pos.coords.latitude, lon: pos.coords.longitude } : null;

      const scores: Record<string, number> = {};
      for (const p of rows) {
        const o = addrStr(p as any, "origen");
        const d = addrStr(p as any, "destino");
        const og = await geocode(o);
        const dg = await geocode(d);
        if (og && dg) {
          let score = haversine(og, dg);
          if (current) score += haversine(current, og);
          scores[p.id] = score;
        } else {
          scores[p.id] = Number.POSITIVE_INFINITY;
        }
      }
      setRouteScores(scores);
    } finally {
      setOptimizing(false);
    }
  }

  async function marcar(id: string, estado: EntregaEstado) {
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-zinc-100">Panel del Repartidor</h1>
        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-600/30">Aceptados</span>
        <button
          onClick={optimizarPorRuta}
          disabled={optimizing}
          className="ml-auto rounded-lg border border-violet-500/40 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:border-violet-400/70 disabled:opacity-60"
        >
          {optimizing ? "Optimizando..." : "Optimizar por ruta (BETA)"}
        </button>
      </div>

      {loading && <p className="text-sm text-zinc-400">Cargando pedidos...</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {!loading && !err && sorted.length === 0 && (
        <p className="text-sm text-zinc-400">No hay pedidos aceptados pendientes de entrega.</p>
      )}

      <div className="space-y-3">
        {sorted.map((p) => {
          const origen = addrStr(p as any, "origen");
          const destino = addrStr(p as any, "destino");
          const fecha = p.fecha ? new Date(p.fecha).toLocaleDateString() : "Sin fecha";
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origen)}&destination=${encodeURIComponent(destino)}&travelmode=driving`;
          const osmUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(origen)}%3B${encodeURIComponent(destino)}`;
          const score = routeScores[p.id];

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
                    {Number.isFinite(score) && (
                      <span className="ml-3 text-xs text-zinc-400">Ruta ~ {score!.toFixed(1)} km</span>
                    )}
                  </div>
                  <div className="text-sm"><span className="text-zinc-400">Origen:</span> <span className="text-zinc-100">{origen || "-"}</span></div>
                  <div className="text-sm"><span className="text-zinc-400">Destino:</span> <span className="text-zinc-100">{destino || "-"}</span></div>
                  <div className="text-xs text-zinc-400 mt-1">
                    <span className="mr-2">Contacto:</span>
                    <span className="text-zinc-200">{p.contacto_nombre}</span>
                    <span className="mx-2">•</span>
                    <a className="text-violet-300 hover:underline" href={`tel:${p.contacto_tel}`}>{p.contacto_tel}</a>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a href={mapsUrl} target="_blank" className="inline-flex items-center justify-center rounded-lg border border-emerald-500/40 px-3 py-1.5 text-sm text-emerald-300 hover:border-emerald-400/70">Ruta (Maps)</a>
                  <a href={osmUrl} target="_blank" className="inline-flex items-center justify-center rounded-lg border border-blue-500/40 px-3 py-1.5 text-sm text-blue-300 hover:border-blue-400/70">Ruta (OSM)</a>
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
                      disabled={savingId === p.id}
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
                          className="w-full mb-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500">
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
                            disabled={savingId === p.id}
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
