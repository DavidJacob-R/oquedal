// components/repartidor/rutas/MisRutas.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Ruta = {
  id: string;
  fecha: string;
  estado: string;
  placas: string | null;
  total: number;
  done: number;
  progreso: number;
};

function estadoRutaLabel(estado: string): string {
  if (estado === "planificada") return "Planificada";
  if (estado === "en_ruta") return "En ruta";
  if (estado === "completada") return "Completada";
  return estado;
}

function estadoRutaClase(estado: string): string {
  if (estado === "planificada") return "bg-sky-500/15 text-sky-200 ring-sky-500/40";
  if (estado === "en_ruta") return "bg-amber-500/15 text-amber-200 ring-amber-500/40";
  if (estado === "completada") return "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40";
  return "bg-neutral-700/40 text-neutral-200 ring-neutral-500/40";
}

function Bar({ pct }: { pct: number }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-900">
      <div
        className="h-full rounded-full bg-emerald-500/80"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export default function MisRutas() {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/repartidor/rutas/list", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudieron cargar las rutas");
      }
      setRutas(data.rutas || []);
    } catch (e: any) {
      setError(e?.message || "Error al cargar las rutas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-sm font-semibold text-neutral-50">Mis rutas</h1>
          <p className="text-[11px] text-neutral-400">
            Selecciona una ruta para ver sus paradas, registrar entregas, incidencias y posponer.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={loading}
          className="rounded-lg px-3 py-1.5 text-[11px] ring-1 ring-white/15 hover:bg-white/5 disabled:opacity-60"
        >
          {loading ? "Actualizando..." : "Refrescar"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[12px] text-red-100">
          {error}
        </div>
      )}

      {loading && rutas.length === 0 && !error && (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-[12px] text-neutral-300">
          Cargando rutas...
        </div>
      )}

      {!loading && rutas.length === 0 && !error && (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-[12px] text-neutral-300">
          No tienes rutas asignadas por el administrador.
        </div>
      )}

      {rutas.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rutas.map((r) => {
            const fechaStr = r.fecha
              ? new Date(r.fecha).toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "Sin fecha";
            const placas = r.placas || "Sin placas";
            const label = estadoRutaLabel(r.estado);
            const badgeClase = estadoRutaClase(r.estado);

            return (
              <Link
                key={r.id}
                href={`/repartidor/rutas/${r.id}`}
                className="relative block overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/60 p-4 ring-1 ring-black/30 hover:border-emerald-500/70 hover:ring-emerald-500/40"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="text-[11px] text-neutral-400">
                      Ruta #
                      <span className="font-semibold text-neutral-100">
                        {String(r.id).slice(0, 8)}
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold text-neutral-50 truncate">
                      {fechaStr}
                    </div>
                    <div className="text-[12px] text-neutral-400 truncate">
                      Vehiculo: <span className="text-neutral-200">{placas}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Paradas completadas:{" "}
                      <span className="text-neutral-100">
                        {r.done}
                      </span>{" "}
                      / {r.total}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] ring-1 ${badgeClase}`}
                  >
                    {label}
                  </span>
                </div>
                <Bar pct={r.progreso} />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
