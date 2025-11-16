"use client";
import { useEffect, useMemo, useState } from "react";

type Parada = {
  id: string;
  secuencia: number;
  estado: string | null;
  llegada_real: string | null;
  salida_real: string | null;

  pedido_id: string;
  folio: number;
  estado_entrega: string | null;

  contacto_nombre: string;
  contacto_tel: string;
  franja_horaria: string;
  descripcion: string;
  volumen_m3: number | null;
  peso_kg: number | null;
  precio_estimado: number | null;

  origen: { direccion: string | null; ciudad: string | null; estado: string | null; cp: string | null };
  destino: { direccion: string | null; ciudad: string | null; estado: string | null; cp: string | null };

  cliente: string;
};

function addrToString(a?: { direccion?: string | null; ciudad?: string | null; estado?: string | null; cp?: string | null }) {
  if (!a) return "—";
  const parts = [a.direccion, a.ciudad, a.estado, a.cp].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function encodeAddr(s: string) {
  return encodeURIComponent(s.trim());
}

function openGoogleAB(origen: string, destino: string) {
  const url =
    `https://www.google.com/maps/dir/?api=1&travelmode=driving` +
    `&origin=${encodeAddr(origen)}` +
    `&destination=${encodeAddr(destino)}`;
  window.open(url, "_blank");
}

function copy(text: string) {
  try { navigator.clipboard.writeText(text); } catch {}
}

export default function RutaDetalle({ rutaId }: { rutaId: string }) {
  const [loading, setLoading] = useState(false);
  const [paradas, setParadas] = useState<Parada[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const r1 = await fetch(`/api/repartidor/rutas/${rutaId}/paradas`, { cache: "no-store" });
      const j1 = await r1.json();
      if (!r1.ok || !j1.ok) throw new Error(j1?.error || "Error paradas");
      setParadas(j1.paradas || []);
    } catch {
      alert("No se pudieron cargar las paradas.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, [rutaId]);

  const shown = useMemo(() => {
    return paradas.map((p) => ({
      ...p,
      origenFull: addrToString(p.origen),
      destinoFull: addrToString(p.destino),
    }));
  }, [paradas]);

  async function llegar(id: string) {
    const r = await fetch("/api/repartidor/paradas/arrive", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paradaId: id }) });
    const j = await r.json();
    if (!r.ok || !j.ok) return alert(j?.error || "No se pudo registrar la llegada.");
    refresh();
  }
  async function finalizar(id: string, resultado: "completo" | "incompleto") {
    const notas = resultado === "incompleto" ? prompt("Motivo / notas:") || "" : "";
    const r = await fetch("/api/repartidor/paradas/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paradaId: id, resultado, notas }) });
    const j = await r.json();
    if (!r.ok || !j.ok) return alert(j?.error || "No se pudo finalizar.");
    refresh();
  }
  async function posponer(id: string) {
    const motivo = prompt("Motivo de posponer:") || "";
    const r = await fetch("/api/repartidor/paradas/posponer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paradaId: id, motivo }) });
    const j = await r.json();
    if (!r.ok || !j.ok) return alert(j?.error || "No se pudo posponer.");
    alert("Parada pospuesta.");
    refresh();
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-400 text-sm">Cargando…</div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-400 text-sm">No hay paradas en esta ruta.</div>
      ) : (
        <div className="space-y-3">
          {shown.map((m, idx) => {
            const estado = m?.estado ?? "pendiente";
            const llego = Boolean(m?.llegada_real);
            const salio = Boolean(m?.salida_real);
            const tel = (m?.contacto_tel || "").replace(/\s+/g, "");
            const infoPeso = (m?.peso_kg != null) ? `${m.peso_kg} kg` : "—";
            const infoVol = (m?.volumen_m3 != null) ? `${m.volumen_m3} m³` : "—";
            const precio = (m?.precio_estimado != null) ? `$${m.precio_estimado}` : "—";
            const origen = m.origenFull || "—";
            const destino = m.destinoFull || "—";

            return (
              <article key={m.id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/40 p-0 ring-1 ring-black/30">
                <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-emerald-500 to-teal-500" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] ring-1 ring-white/10 text-neutral-200">
                          📦 Folio <b className="ml-1">{m?.folio ?? "—"}</b>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] ring-1 ring-white/10 text-neutral-300">
                          👤 {m?.cliente ?? "Cliente"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] ring-1 ring-white/10 text-neutral-300">
                          🧾 {m?.estado_entrega ?? "pendiente"}
                        </span>
                      </div>
                      <div className="text-[13px] text-neutral-400">
                        A: <span className="text-neutral-200">{origen}</span>
                      </div>
                      <div className="text-[13px] text-neutral-400">
                        B: <span className="text-neutral-200">{destino}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-block rounded-full bg-white/5 px-2 py-0.5 text-[11px] ring-1 ring-white/10 text-neutral-300">
                        {estado}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                      <div className="text-neutral-400">👤 Contacto</div>
                      <div className="text-neutral-200">{m?.contacto_nombre || "—"}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <a href={tel ? `tel:${tel}` : "#"} className="rounded-md bg-white/5 px-2 py-1 ring-1 ring-white/10 text-neutral-200 hover:bg-white/10">
                          ☎️ Llamar
                        </a>
                        <button onClick={() => copy(m?.contacto_tel || "")} className="rounded-md bg-white/5 px-2 py-1 ring-1 ring-white/10 text-neutral-200 hover:bg-white/10">
                          📋 Copiar
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                      <div className="text-neutral-400">🕒 Ventana</div>
                      <div className="text-neutral-200">{m?.franja_horaria || "—"}</div>
                      <div className="mt-1 text-neutral-400">⚖️ Peso: <span className="text-neutral-200">{infoPeso}</span> • 📦 Vol: <span className="text-neutral-200">{infoVol}</span></div>
                      <div className="mt-1 text-neutral-400">💲 Estimado: <span className="text-neutral-200">{precio}</span></div>
                    </div>

                    {m?.descripcion ? (
                      <div className="sm:col-span-2 rounded-lg border border-white/10 bg-white/5 p-2">
                        <div className="text-neutral-400">📝 Notas</div>
                        <div className="text-neutral-200 line-clamp-3">{m.descripcion}</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => openGoogleAB(origen, destino)}
                      className="rounded-lg px-3 py-2 text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-500"
                      title="Abrir Google Maps (A → B con direcciones del pedido)"
                    >
                      🧭 Abrir Google (A→B)
                    </button>

                    <button
                      onClick={() => copy(`${origen} → ${destino}`)}
                      className="rounded-lg bg-white/5 px-3 py-2 text-xs text-neutral-200 ring-1 ring-white/10 hover:bg-white/10"
                    >
                      📋 Copiar A→B
                    </button>

                    {!llego && (
                      <button
                        onClick={() => llegar(m.id)}
                        className="rounded-lg bg-white/5 px-3 py-2 text-xs text-neutral-200 ring-1 ring-white/10 hover:bg-white/10"
                      >
                        Llegué
                      </button>
                    )}
                    {!salio && (
                      <>
                        <button
                          onClick={() => finalizar(m.id, "completo")}
                          className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
                        >
                          Finalizar (OK)
                        </button>
                        <button
                          onClick={() => finalizar(m.id, "incompleto")}
                          className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
                        >
                          Finalizar (Inc)
                        </button>
                        <button
                          onClick={() => posponer(m.id)}
                          className="rounded-lg bg-white/5 px-3 py-2 text-xs text-neutral-200 ring-1 ring-white/10 hover:bg-white/10"
                        >
                          Posponer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
