// components/repartidor/rutas/MisRutas.tsx
"use client";
import { useEffect, useState } from "react";

type Ruta = {
  id: string;
  fecha: string;
  estado: string;
  placas: string;
  total: number;
  done: number;
  progreso: number;
};

function Bar({ pct }: { pct: number }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-black/30">
      <div className="h-full bg-orange-500/70" style={{ width: `${v}%` }} />
    </div>
  );
}

export default function MisRutas() {
  const [loading, setLoading] = useState(false);
  const [rutas, setRutas] = useState<Ruta[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/repartidor/rutas/list", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || "Error");
      setRutas(j.rutas || []);
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar tus rutas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  if (rutas.length === 0) {
    return <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-400 text-sm">No tienes rutas hoy.</div>;
  }

  return (
    <div className="space-y-3">
      {rutas.map((r) => (
        <a key={r.id} href={`/repartidor/rutas/${r.id}`} className="block rounded-2xl border border-white/10 bg-neutral-950/40 p-4 ring-1 ring-black/30 hover:bg-neutral-900/40">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[13px] text-neutral-400">
                {new Date(r.fecha).toLocaleDateString("es-MX")} • {r.placas}
              </div>
              <div className="text-[12px] text-neutral-400">Paradas: <span className="text-neutral-200">{r.done}</span> / {r.total}</div>
            </div>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] ring-1 ring-white/10 text-neutral-300">
              {r.estado === "en_ruta" ? "En curso" : r.estado === "planificada" ? "Planificada" : "Completada"}
            </span>
          </div>
          <div className="mt-2"><Bar pct={r.progreso} /></div>
        </a>
      ))}
    </div>
  );
}
