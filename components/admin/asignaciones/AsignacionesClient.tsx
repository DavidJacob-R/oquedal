// components/admin/asignaciones/AsignacionesClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { QUOTA_EXTRA_START, QUOTA_MAX_BLOCK } from "@/lib/quota";

type PedidoPend = {
  id: string;
  folio: number;
  created_at: string;
  estado: string;
  estado_entrega: string;
  cliente: string;
  estimado_sugerido: number;
};

type PedidoAsignado = {
  id: string;
  folio: number;
  created_at: string;
  cliente: string;
  repartidor_id: string;
  repartidor_nombre: string;
  horas: number;
};

type Repartidor = {
  id: string;
  nombre: string;
  totalEstimadoHoy: number;
  ayudantes: number;
};

type Props = { initialRepartidores: Repartidor[] };

function Progress({ value }: { value: number }) {
  const v = Number(value ?? 0);
  const pct = Math.max(0, Math.min(100, (v / 8) * 100));
  const danger = v > QUOTA_EXTRA_START;
  const warn = !danger && v > 7.5;
  const barCls = danger ? "bg-amber-500/70" : warn ? "bg-amber-500/70" : "bg-emerald-500/70";
  return (
    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden ring-1 ring-black/30">
      <div className={`h-full ${barCls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AsignacionesClient({ initialRepartidores }: Props) {
  const [repartidores, setRepartidores] = useState<Repartidor[]>(
    initialRepartidores.map(r => ({ ...r, totalEstimadoHoy: Number(r.totalEstimadoHoy ?? 0) }))
  );
  const [pendientes, setPendientes] = useState<PedidoPend[]>([]);
  const [asignados, setAsignados] = useState<PedidoAsignado[]>([]);
  const [repSelect, setRepSelect] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const repMap = useMemo(() => {
    const m: Record<string, Repartidor> = {};
    for (const r of repartidores) m[r.id] = r;
    return m;
  }, [repartidores]);

  async function refresh() {
    setLoading(true);
    try {
      const [rp, pp, aa] = await Promise.all([
        fetch("/api/admin/empleados/repartidores", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/admin/asignaciones/pendientes", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/admin/asignaciones/asignados", { cache: "no-store" }).then(r => r.json()),
      ]);

      const reps: Repartidor[] = (rp.repartidores || rp.empleados || []).map((r: any) => ({
        id: r.id,
        nombre: r.nombre,
        totalEstimadoHoy: Number(r.totalEstimadoHoy ?? r.total_hoy ?? 0),
        ayudantes: Number(r.ayudantes ?? 0),
      }));

      setRepartidores(reps);
      setPendientes((pp.pedidos || []).map((p: any) => ({
        ...p,
        estimado_sugerido: Number(p.estimado_sugerido ?? 0),
      })));
      setAsignados((aa.asignados || []).map((a: any) => ({
        ...a,
        horas: Number(a.horas ?? 0),
      })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Carga inicial (trae acumulados del día y pinta de inmediato la barra)
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function predictedTotal(repId: string | undefined, pedido: { estimado_sugerido: number }): number | null {
    if (!repId) return null;
    const r = repMap[repId];
    if (!r) return null;
    return Number(r.totalEstimadoHoy || 0) + Number(pedido.estimado_sugerido || 0);
  }

  async function asignar(pedidoId: string) {
    const repartidorId = repSelect[pedidoId];
    if (!repartidorId) return alert("Selecciona un repartidor.");
    const p = pendientes.find(x => x.id === pedidoId)!;

    const newTotal = predictedTotal(repartidorId, p);
    if (newTotal !== null && newTotal > QUOTA_MAX_BLOCK) {
      return alert(`No permitido: la carga quedaría en ${newTotal.toFixed(2)}h (> ${QUOTA_MAX_BLOCK.toFixed(2)}h).`);
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/asignaciones/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pedidoId, repartidorId }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data?.error || "Error al asignar.");

      const horas = Number(data?.horas ?? p.estimado_sugerido ?? 0);

      // Actualizar barra del repartidor en caliente (acumuladas del día)
      setRepartidores(prev =>
        prev.map(r => r.id === repartidorId
          ? { ...r, totalEstimadoHoy: Number(r.totalEstimadoHoy || 0) + horas }
          : r
        )
      );

      // Quitar de pendientes y refrescar listas para mantener consistencia
      setPendientes(prev => prev.filter(x => x.id !== pedidoId));
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function cancelarAsignacion(pedidoId: string) {
    if (!confirm("¿Cancelar esta asignación?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/asignaciones/unassign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data?.error || "Error al cancelar la asignación.");

      const repId: string | undefined = data?.repartidorId;
      const horas: number = Number(data?.horas ?? 0);

      if (repId) {
        // Restar del acumulado del día
        setRepartidores(prev =>
          prev.map(r => r.id === repId
            ? { ...r, totalEstimadoHoy: Math.max(0, Number(r.totalEstimadoHoy || 0) - horas) }
            : r
          )
        );
      }
      // Quitar de asignados y refrescar (volverá a pendientes)
      setAsignados(prev => prev.filter(a => a.id !== pedidoId));
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  const optionDisabled = (r: Repartidor, estimado: number) =>
    (Number(r.totalEstimadoHoy || 0) + Number(estimado || 0)) > QUOTA_MAX_BLOCK;

  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* IZQ: Pendientes */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Pedidos pendientes</h2>
            <button onClick={refresh} disabled={loading} className="rounded-xl px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/5">
              {loading ? "Actualizando..." : "Refrescar"}
            </button>
          </div>

          <div className="space-y-3">
            {pendientes.length === 0 ? (
              <div className="text-neutral-400">No hay pedidos pendientes.</div>
            ) : (
              pendientes.map((p) => {
                const repSel = repSelect[p.id] || "";
                const newTotal = repSel ? (Number(repMap[repSel]?.totalEstimadoHoy || 0) + Number(p.estimado_sugerido || 0)) : null;
                const blocked = newTotal !== null && newTotal > QUOTA_MAX_BLOCK;
                const extras = newTotal !== null && newTotal > QUOTA_EXTRA_START && !blocked;

                return (
                  <article key={p.id} className="group rounded-2xl border border-white/10 bg-neutral-900/40 p-4 ring-1 ring-black/30 transition hover:border-white/15 hover:bg-neutral-900/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-[13px] text-neutral-400">
                          Folio <span className="font-mono text-[13px] text-neutral-200">#{p.folio}</span> • {new Date(p.created_at).toLocaleString("es-MX")}
                        </div>
                        <div className="text-[15px] font-medium text-neutral-100">{p.cliente}</div>
                      </div>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] ring-1 ring-white/10 text-neutral-300">
                        Est. {Number(p.estimado_sugerido ?? 0).toFixed(2)}h
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <div className="flex items-center gap-2 md:col-span-2">
                        <label className="text-[12px] text-neutral-400 w-24">Repartidor</label>
                        <select
                          value={repSel}
                          onChange={(e) => setRepSelect((s) => ({ ...s, [p.id]: e.target.value }))}
                          className="w-full rounded-lg bg-neutral-800/70 px-2 py-1 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
                        >
                          <option value="">Seleccionar</option>
                          {repartidores.map((r) => {
                            const dis = optionDisabled(r, Number(p.estimado_sugerido ?? 0));
                            const tag =
                              Number(r.totalEstimadoHoy || 0) >= QUOTA_MAX_BLOCK
                                ? " • tope"
                                : dis
                                ? " • excede"
                                : "";
                            return (
                              <option key={r.id} value={r.id} disabled={dis}>
                                {r.nombre} — {Number(r.totalEstimadoHoy || 0).toFixed(2)}h{tag}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {newTotal !== null && !isNaN(newTotal) && (
                      <div className="mt-3 text-[12px] text-neutral-300">
                        <div className="mb-1 flex items-center justify-between">
                          <span>Carga si asignas:</span>
                          <span className={blocked ? "text-red-300" : extras ? "text-amber-300" : "text-emerald-300"}>
                            {Number(newTotal).toFixed(2)}h {blocked ? "• Bloqueado (tope)" : extras ? "• Horas extra" : "• OK"}
                          </span>
                        </div>
                        <Progress value={Number(newTotal)} />
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => asignar(p.id)}
                        disabled={loading || !repSel || blocked}
                        className="inline-flex items-center gap-2 rounded-xl bg-orange-500/20 px-3 py-1.5 text-sm text-orange-200 ring-1 ring-orange-500/30 hover:bg-orange-500/25 disabled:opacity-50"
                        title={blocked ? "Tope alcanzado" : "Asignar pedido"}
                      >
                        Asignar
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* DER: Repartidores y barra de horas acumuladas (HOY) */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Carga de repartidores (hoy)</h2>
            <button onClick={refresh} disabled={loading} className="rounded-xl px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/5">
              {loading ? "Actualizando..." : "Refrescar"}
            </button>
          </div>

          <div className="space-y-3">
            {repartidores.map((r) => {
              const v = Number(r.totalEstimadoHoy || 0);
              const atMax = v >= QUOTA_MAX_BLOCK;
              const danger = v > QUOTA_EXTRA_START;
              const warn = !danger && v > 7.5;
              return (
                <article key={r.id} className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4 ring-1 ring-black/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[15px] font-medium text-neutral-100">
                        {r.nombre} {atMax && <span className="ml-2 rounded-full bg-red-600/20 px-2 py-0.5 text-[10px] text-red-300 ring-1 ring-red-600/30">tope</span>}
                      </div>
                      <div className="text-[12px] text-neutral-400">Ayudantes: {r.ayudantes}</div>
                    </div>
                    <div className={`text-[12px] ${danger ? "text-amber-300" : warn ? "text-amber-300" : "text-emerald-300"}`}>
                      {v.toFixed(2)}h
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={v} />
                  </div>
                </article>
              );
            })}
            {repartidores.length === 0 && <div className="text-neutral-400">No hay repartidores activos.</div>}
          </div>
        </section>
      </div>

      {/* Abajo: Asignados + cancelar */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Pedidos asignados</h2>
          <button onClick={refresh} disabled={loading} className="rounded-xl px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/5">
            {loading ? "Actualizando..." : "Refrescar"}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {asignados.length === 0 ? (
            <div className="text-neutral-400">No hay pedidos asignados.</div>
          ) : (
            asignados.map((a) => (
              <article key={a.id} className="group rounded-2xl border border-white/10 bg-neutral-900/40 p-4 ring-1 ring-black/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-[13px] text-neutral-400">
                      Folio <span className="font-mono text-[13px] text-neutral-200">#{a.folio}</span> • {new Date(a.created_at).toLocaleString("es-MX")}
                    </div>
                    <div className="text-[15px] font-medium text-neutral-100">{a.cliente}</div>
                    <div className="text-[12px] text-neutral-300">
                      Repartidor: <span className="text-neutral-100">{a.repartidor_nombre}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] ring-1 ring-white/10 text-neutral-300">
                    {Number(a.horas ?? 0).toFixed(2)}h
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-end">
                  <button
                    onClick={() => cancelarAsignacion(a.id)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500/20 px-3 py-1.5 text-sm text-red-200 ring-1 ring-red-500/30 hover:bg-red-500/25 disabled:opacity-50"
                    title="Cancelar asignación"
                  >
                    Cancelar asignación
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
