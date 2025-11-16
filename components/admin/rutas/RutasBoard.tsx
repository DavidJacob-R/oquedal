// components/admin/rutas/RutasBoard.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Ruta = {
  id: string;
  fecha: string;
  estado: "planificada" | "en_ruta" | "completada" | string;
  placas: string;
  repartidor: string;
  total: number;
  done: number;
  progreso: number;
};

function Bar({ pct }: { pct: number }) {
  const v = Math.max(0, Math.min(100, pct));
  const danger = v < 50;
  const ok = v >= 100;
  const cls = ok ? "bg-emerald-500/70" : danger ? "bg-amber-500/70" : "bg-orange-500/70";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-black/30">
      <div className={`h-full ${cls}`} style={{ width: `${v}%` }} />
    </div>
  );
}

export default function RutasBoard() {
  const [loading, setLoading] = useState(false);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/rutas/list", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || "Error");
      setRutas(j.rutas || []);
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar las rutas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const s = q.trim().toLowerCase();
  const fil = useMemo(() => {
    if (!s) return rutas;
    return rutas.filter(
      (x) =>
        (x.repartidor || "").toLowerCase().includes(s) ||
        (x.placas || "").toLowerCase().includes(s) ||
        (x.estado || "").toLowerCase().includes(s) ||
        String(x.total).includes(s) ||
        String(x.done).includes(s)
    );
  }, [rutas, s]);

  const planificadas = fil.filter((r) => r.estado === "planificada");
  const enRuta = fil.filter((r) => r.estado === "en_ruta");
  const completadas = fil.filter((r) => r.estado === "completada");

  function Card(r: Ruta) {
    return (
      <article key={r.id} className="rounded-2xl border border-white/10 bg-neutral-950/40 p-4 ring-1 ring-black/30">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="text-[13px] text-neutral-400">
              Fecha: <span className="text-neutral-200">{new Date(r.fecha).toLocaleDateString("es-MX")}</span>
            </div>
            <div className="text-[15px] font-medium text-neutral-100 truncate">
              {r.repartidor} <span className="text-neutral-400">•</span> {r.placas}
            </div>
            <div className="text-[12px] text-neutral-400">
              Paradas: <span className="text-neutral-200">{r.done}</span> / <span className="text-neutral-200">{r.total}</span>
            </div>
          </div>
          <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] ring-1 ring-white/10 text-neutral-300">
            {r.estado === "en_ruta" ? "En curso" : r.estado === "planificada" ? "Planificada" : "Completada"}
          </span>
        </div>
        <div className="mt-2"><Bar pct={r.progreso} /></div>
      </article>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full px-2 py-1 text-[11px] ring-1 ring-white/10 bg-white/5 text-neutral-300">
            Hoy: {rutas.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por repartidor, placas, estado…"
            className="w-80 rounded-lg bg-neutral-800/70 px-3 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
          />
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/5"
          >
            {loading ? "…" : "Refrescar"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">En curso / Planificadas</h2>
            <span className="text-xs text-neutral-400">Rutas de hoy</span>
          </div>
          {[...enRuta, ...planificadas].length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-400 text-sm">
              Sin rutas en curso o planificadas.
            </div>
          ) : (
            [...enRuta, ...planificadas].map(Card)
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Completadas</h2>
            <span className="text-xs text-neutral-400">Rutas de hoy</span>
          </div>
          {completadas.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-400 text-sm">
              Aún no hay rutas completadas.
            </div>
          ) : (
            completadas.map(Card)
          )}
        </section>
      </div>
    </div>
  );
}
