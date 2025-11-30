// components/repartidor/rutas/RutaDetalle.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type EstadoEntrega = "pendiente" | "completo" | "incompleto" | "pospuesto" | string;

type Direccion = {
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  cp: string | null;
};

type Parada = {
  id: string;
  secuencia: number;
  estado: string | null;
  llegada_real: string | null;
  salida_real: string | null;

  pedido_id: string;
  folio: number;
  estado_entrega: EstadoEntrega | null;

  contacto_nombre: string | null;
  contacto_tel: string | null;
  franja_horaria: string | null;
  descripcion: string | null;
  volumen_m3: number | null;
  peso_kg: number | null;
  precio_estimado: number | null;

  origen: Direccion | null;
  destino: Direccion | null;

  cliente: string;
};

type ParadaUI = Parada & {
  origenFull: string;
  destinoFull: string;
};

function addrToString(a: Direccion | null | undefined): string {
  if (!a) return "";
  const parts = [a.direccion, a.ciudad, a.estado, a.cp].filter(Boolean);
  return parts.join(", ");
}

function estadoEntregaLabel(e: EstadoEntrega | null): string {
  if (!e) return "Pendiente";
  if (e === "completo") return "Completo";
  if (e === "incompleto") return "Incompleto";
  if (e === "pospuesto") return "Pospuesto";
  if (e === "pendiente") return "Pendiente";
  return String(e);
}

function estadoEntregaClase(e: EstadoEntrega | null): string {
  if (e === "completo") return "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40";
  if (e === "incompleto") return "bg-red-500/15 text-red-200 ring-red-500/40";
  if (e === "pospuesto") return "bg-amber-500/15 text-amber-200 ring-amber-500/40";
  return "bg-neutral-700/40 text-neutral-200 ring-neutral-500/40";
}

type Props = {
  rutaId: string;
};

export default function RutaDetalle({ rutaId }: Props) {
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [loading, setLoading] = useState(false);
  const [accionId, setAccionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargarParadas() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repartidor/rutas/${rutaId}/paradas`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudieron cargar las paradas");
      }
      setParadas(data.paradas || []);
    } catch (e: any) {
      setError(e?.message || "Error al cargar las paradas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarParadas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutaId]);

  const shown: ParadaUI[] = useMemo(
    () =>
      paradas.map((p) => ({
        ...p,
        origenFull: addrToString(p.origen),
        destinoFull: addrToString(p.destino),
      })),
    [paradas]
  );

  const totalParadas = paradas.length;
  const completadas = paradas.filter((p) => p.estado_entrega === "completo").length;
  const progreso = totalParadas > 0 ? Math.round((completadas / totalParadas) * 100) : 0;

  async function marcarLlegada(id: string) {
    setAccionId(id);
    try {
      const res = await fetch("/api/repartidor/paradas/arrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paradaId: id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo registrar la llegada");
      }
      await cargarParadas();
    } catch (e: any) {
      alert(e?.message || "Error al registrar la llegada");
    } finally {
      setAccionId(null);
    }
  }

  async function finalizarParada(id: string, resultado: "completo" | "incompleto") {
    const notas =
      resultado === "incompleto"
        ? window.prompt("Motivo / notas adicionales de la incidencia:") || ""
        : "";

    setAccionId(id);
    try {
      const res = await fetch("/api/repartidor/paradas/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paradaId: id, resultado, notas }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo finalizar la parada");
      }
      await cargarParadas();
    } catch (e: any) {
      alert(e?.message || "Error al finalizar la parada");
    } finally {
      setAccionId(null);
    }
  }

  async function posponerParada(id: string) {
    const motivo = window.prompt("Motivo de posponer la entrega:") || "";
    if (!motivo.trim()) {
      return;
    }

    setAccionId(id);
    try {
      const res = await fetch(`/api/repartidor/rutas/${rutaId}/paradas/posponer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paradaId: id, motivo }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo posponer la parada");
      }
      alert("Parada pospuesta.");
      await cargarParadas();
    } catch (e: any) {
      alert(e?.message || "Error al posponer la parada");
    } finally {
      setAccionId(null);
    }
  }

  function abrirEnMapa(origen: string, destino: string) {
    const o = origen || "";
    const d = destino || "";
    if (!o && !d) return;
    const url = `https://www.google.com/maps/dir/${encodeURIComponent(o)}/${encodeURIComponent(
      d
    )}`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-4 ring-1 ring-black/30 flex items-center justify-between gap-4">
        <div className="text-[12px] text-neutral-400">
          Paradas completadas:{" "}
          <span className="text-neutral-100 font-medium">
            {completadas}
          </span>{" "}
          / {totalParadas}
        </div>
        <div className="flex items-center gap-2 min-w-[160px]">
          <div className="flex-1 h-2 rounded-full bg-neutral-900 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500/80"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <span className="text-[11px] text-neutral-300 w-10 text-right">
            {progreso}%
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[12px] text-red-100">
          {error}
        </div>
      )}

      {loading && shown.length === 0 && !error && (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6 text-sm text-neutral-300">
          Cargando paradas...
        </div>
      )}

      {!loading && shown.length === 0 && !error && (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6 text-sm text-neutral-300">
          No hay paradas en esta ruta.
        </div>
      )}

      {shown.length > 0 && (
        <div className="space-y-3">
          {shown.map((p) => {
            const estadoEntrega = p.estado_entrega as EstadoEntrega | null;
            const estadoLabel = estadoEntregaLabel(estadoEntrega);
            const estadoClase = estadoEntregaClase(estadoEntrega);
            const destino = p.destinoFull || "—";
            const origen = p.origenFull || "—";
            const peso = p.peso_kg != null ? `${p.peso_kg} kg` : "—";
            const vol = p.volumen_m3 != null ? `${p.volumen_m3} m³` : "—";
            const precio =
              p.precio_estimado != null ? `$${p.precio_estimado}` : "—";
            const horario = p.franja_horaria || "Sin horario";
            const contactoNombre = p.contacto_nombre || "Sin nombre";
            const contactoTel = p.contacto_tel || "";
            const telHref = contactoTel ? `tel:${contactoTel}` : undefined;
            const estaProcesando = accionId === p.id;

            return (
              <article
                key={p.id}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/60 p-0 ring-1 ring-black/30"
              >
                <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-emerald-500 to-teal-500" />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[11px] ring-1 ring-white/10 text-neutral-200">
                          Parada #{p.secuencia}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          Pedido{" "}
                          <span className="font-semibold text-neutral-100">
                            #{p.folio}
                          </span>
                        </span>
                      </div>
                      <div className="text-[13px] font-semibold text-neutral-50 truncate">
                        {p.cliente}
                      </div>
                      <div className="text-[12px] text-neutral-400 line-clamp-2">
                        Destino:{" "}
                        <span className="text-neutral-200">{destino}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Origen:{" "}
                        <span className="text-neutral-300">{origen}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-400">
                        <span>
                          Horario:{" "}
                          <span className="text-neutral-200">
                            {horario}
                          </span>
                        </span>
                        <span>
                          Peso:{" "}
                          <span className="text-neutral-200">{peso}</span>
                        </span>
                        <span>
                          Volumen:{" "}
                          <span className="text-neutral-200">{vol}</span>
                        </span>
                        <span>
                          Precio estimado:{" "}
                          <span className="text-neutral-200">
                            {precio}
                          </span>
                        </span>
                      </div>
                      {p.descripcion && (
                        <div className="text-[11px] text-neutral-400 line-clamp-2">
                          Descripcion:{" "}
                          <span className="text-neutral-200">
                            {p.descripcion}
                          </span>
                        </div>
                      )}
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] ring-1 ${estadoClase}`}
                    >
                      {estadoLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                    <div className="flex flex-wrap gap-2">
                      {telHref && (
                        <a
                          href={telHref}
                          className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] text-neutral-100 hover:bg-white/10"
                        >
                          ☎️ Llamar
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => abrirEnMapa(origen, destino)}
                        className="inline-flex items-center rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[11px] text-sky-100 hover:bg-sky-500/20"
                      >
                        Ver en mapa
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => marcarLlegada(p.id)}
                        disabled={estaProcesando}
                        className="inline-flex items-center rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60"
                      >
                        Llegada
                      </button>
                      <button
                        type="button"
                        onClick={() => finalizarParada(p.id, "completo")}
                        disabled={estaProcesando}
                        className="inline-flex items-center rounded-lg border border-emerald-500/60 bg-emerald-500/15 px-3 py-1.5 text-[11px] text-emerald-50 hover:bg-emerald-500/25 disabled:opacity-60"
                      >
                        Finalizar (OK)
                      </button>
                      <button
                        type="button"
                        onClick={() => finalizarParada(p.id, "incompleto")}
                        disabled={estaProcesando}
                        className="inline-flex items-center rounded-lg border border-red-500/60 bg-red-500/15 px-3 py-1.5 text-[11px] text-red-50 hover:bg-red-500/25 disabled:opacity-60"
                      >
                        Finalizar (Inc)
                      </button>
                      <button
                        type="button"
                        onClick={() => posponerParada(p.id)}
                        disabled={estaProcesando}
                        className="inline-flex items-center rounded-lg border border-amber-500/60 bg-amber-500/15 px-3 py-1.5 text-[11px] text-amber-50 hover:bg-amber-500/25 disabled:opacity-60"
                      >
                        Posponer
                      </button>
                    </div>
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
