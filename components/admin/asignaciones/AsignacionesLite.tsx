// components/admin/asignaciones/AsignacionesPro.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { QUOTA_EXTRA_START, QUOTA_MAX_BLOCK } from "@/lib/quota";

/* Tipos */
type Repartidor = {
  id: string;
  nombre: string;
  totalEstimadoHoy: number;
  ayudantes: number;
};
type PedidoPend = {
  id: string;
  folio: number;
  created_at: string;
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

/* UI */
function Progress({ value }: { value: number }) {
  const v = Number(value ?? 0);
  const pct = Math.max(0, Math.min(100, (v / 8) * 100));
  const danger = v > QUOTA_EXTRA_START;
  const warn = !danger && v > 7.5;
  const barCls = danger ? "bg-amber-500/70" : warn ? "bg-amber-500/70" : "bg-emerald-500/70";
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden ring-1 ring-black/30">
      <div className={`h-full ${barCls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
function Chip({ children, tone = "default" }: { children: React.ReactNode; tone?: "ok" | "warn" | "danger" | "default" }) {
  const cls =
    tone === "danger"
      ? "ring-red-500/40 text-red-200 bg-red-500/10"
      : tone === "warn"
      ? "ring-amber-500/40 text-amber-200 bg-amber-500/10"
      : tone === "ok"
      ? "ring-emerald-500/40 text-emerald-200 bg-emerald-500/10"
      : "ring-white/10 text-neutral-300 bg-white/5";
  return <span className={`rounded-full px-2 py-1 text-[11px] ring-1 ${cls}`}>{children}</span>;
}

/* Componente principal */
export default function AsignacionesPro() {
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [pendientes, setPendientes] = useState<PedidoPend[]>([]);
  const [asignados, setAsignados] = useState<PedidoAsignado[]>([]);
  const [repSelect, setRepSelect] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const repMap = useMemo(() => {
    const m: Record<string, Repartidor> = {};
    for (const r of repartidores) m[r.id] = r;
    return m;
  }, [repartidores]);

  const repartidoresOrdenados = useMemo(() => {
    return [...repartidores].sort((a, b) => {
      const restA = QUOTA_MAX_BLOCK - Number(a.totalEstimadoHoy || 0);
      const restB = QUOTA_MAX_BLOCK - Number(b.totalEstimadoHoy || 0);
      return restB - restA;
    });
  }, [repartidores]);

  const pendientesFiltrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pendientes;
    return pendientes.filter(
      (p) => String(p.folio).includes(s) || (p.cliente || "").toLowerCase().includes(s)
    );
  }, [pendientes, q]);

  const allCheckedOnPage = useMemo(
    () => pendientesFiltrados.length > 0 && pendientesFiltrados.every((p) => checked[p.id]),
    [pendientesFiltrados, checked]
  );

  async function refresh() {
    setLoading(true);
    try {
      const [rp, pp, aa] = await Promise.all([
        fetch("/api/admin/empleados/repartidores", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/asignaciones/pendientes", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/asignaciones/asignados", { cache: "no-store" }).then((r) => r.json()),
      ]);
      const reps: Repartidor[] = (rp.repartidores || rp.empleados || []).map((r: any) => ({
        id: r.id,
        nombre: r.nombre,
        totalEstimadoHoy: Number(r.totalEstimadoHoy ?? r.total_hoy ?? 0),
        ayudantes: Number(r.ayudantes ?? 0),
      }));
      setRepartidores(reps);
      setPendientes((pp.pedidos || []).map((p: any) => ({
        id: p.id,
        folio: p.folio,
        created_at: p.created_at,
        cliente: p.cliente,
        estimado_sugerido: Number(p.estimado_sugerido ?? 0),
      })));
      setAsignados((aa.asignados || []).map((a: any) => ({ ...a, horas: Number(a.horas ?? 0) })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function predictedTotal(repId: string | undefined, estimado: number): number | null {
    if (!repId) return null;
    const r = repMap[repId];
    if (!r) return null;
    return Number(r.totalEstimadoHoy || 0) + Number(estimado || 0);
  }

  function pickBestRepartidor(estimado: number): string | null {
    let bestId: string | null = null;
    let bestTotal = Number.POSITIVE_INFINITY;
    for (const r of repartidores) {
      const t = Number(r.totalEstimadoHoy || 0) + Number(estimado || 0);
      if (t <= QUOTA_MAX_BLOCK && t < bestTotal) {
        bestTotal = t;
        bestId = r.id;
      }
    }
    return bestId;
  }

  async function doAssign(pedidoId: string, repartidorId: string, estimado: number) {
    const newTotal = predictedTotal(repartidorId, estimado);
    if (newTotal !== null && newTotal > QUOTA_MAX_BLOCK) {
      alert(`No permitido (> ${QUOTA_MAX_BLOCK.toFixed(2)}h).`);
      return false;
    }
    const res = await fetch("/api/admin/asignaciones/assign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pedidoId, repartidorId }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Error al asignar");
      return false;
    }
    const horas = Number(data?.horas ?? estimado ?? 0);
    setRepartidores((prev) =>
      prev.map((r) => (r.id === repartidorId ? { ...r, totalEstimadoHoy: Number(r.totalEstimadoHoy || 0) + horas } : r))
    );
    setPendientes((prev) => prev.filter((x) => x.id !== pedidoId));
    return true;
  }

  async function assignRow(p: PedidoPend) {
    setLoading(true);
    try {
      const selected = repSelect[p.id];
      const target = selected || pickBestRepartidor(p.estimado_sugerido);
      if (!target) {
        alert("Sin repartidor disponible debajo del tope.");
        return;
      }
      const ok = await doAssign(p.id, target, p.estimado_sugerido);
      if (ok) await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function bulkAssign() {
    const ids = pendientesFiltrados.filter((p) => checked[p.id]).map((p) => p.id);
    if (ids.length === 0) {
      alert("Selecciona al menos un pedido.");
      return;
    }
    setLoading(true);
    try {
      const jobs = pendientes
        .filter((p) => ids.includes(p.id))
        .sort((a, b) => b.estimado_sugerido - a.estimado_sugerido);

      let okCount = 0;
      let failCount = 0;

      for (const p of jobs) {
        const best = pickBestRepartidor(p.estimado_sugerido);
        if (!best) {
          failCount++;
          continue;
        }
        const ok = await doAssign(p.id, best, p.estimado_sugerido);
        if (ok) {
          okCount++;
          setChecked((c) => ({ ...c, [p.id]: false }));
        } else {
          failCount++;
        }
      }

      await refresh();
      alert(`Asignados: ${okCount} • Sin asignar: ${failCount}`);
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
      if (!res.ok) {
        alert(data?.error || "Error al cancelar");
        return;
      }
      const repId: string | undefined = data?.repartidorId;
      const horas: number = Number(data?.horas ?? 0);
      if (repId) {
        setRepartidores((prev) =>
          prev.map((r) =>
            r.id === repId ? { ...r, totalEstimadoHoy: Math.max(0, Number(r.totalEstimadoHoy || 0) - horas) } : r
          )
        );
      }
      setAsignados((prev) => prev.filter((a) => a.id !== pedidoId));
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  /* UI */
  return (
    <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
      {/* Principal: Pendientes (tabla) */}
      <section className="rounded-2xl border border-white/10 bg-neutral-950/40 ring-1 ring-black/30">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">Pendientes</div>
            <Chip>{pendientes.length}</Chip>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar folio/cliente…"
              className="w-48 rounded-lg bg-neutral-800/70 px-3 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
            />
            <button
              onClick={() => {
                const flip = !allCheckedOnPage;
                const n: Record<string, boolean> = { ...checked };
                pendientesFiltrados.forEach((p) => (n[p.id] = flip));
                setChecked(n);
              }}
              className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/5"
            >
              {allCheckedOnPage ? "Deseleccionar" : "Seleccionar página"}
            </button>
            <button
              onClick={bulkAssign}
              disabled={loading}
              className="rounded-lg bg-orange-500/20 px-3 py-1.5 text-sm text-orange-200 ring-1 ring-orange-500/30 hover:bg-orange-500/25 disabled:opacity-50"
              title="Distribuye automáticamente los seleccionados al mejor repartidor disponible"
            >
              Asignar auto
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/5"
            >
              {loading ? "…" : "Refrescar"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* IMPORTANTE: usamos border-separate y sticky en TH con top-0 */}
          <table className="w-full min-w-[980px] text-sm table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: 44 }} />
              <col style={{ width: 100 }} />
              {/* Cliente flexible: sin width fija */}
              <col />
              <col style={{ width: 110 }} />
              <col style={{ width: 260 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 160 }} />
            </colgroup>

            <thead>
              <tr className="text-[12px] text-neutral-400">
                {[
                  { label: "", align: "text-left" },
                  { label: "Folio", align: "text-left" },
                  { label: "Cliente", align: "text-left" },
                  { label: "Est. (h)", align: "text-left" },
                  { label: "Repartidor", align: "text-left" },
                  { label: "Nuevo", align: "text-left" },
                  { label: "Acciones", align: "text-right" },
                ].map((h, i) => (
                  <th
                    key={i}
                    className={`sticky top-0 z-20 bg-neutral-950/90 backdrop-blur ${h.align} px-3 py-2 whitespace-nowrap border-b border-white/10`}
                  >
                    {i === 0 ? (
                      <input
                        type="checkbox"
                        checked={allCheckedOnPage}
                        onChange={() => {
                          const flip = !allCheckedOnPage;
                          const n: Record<string, boolean> = { ...checked };
                          pendientesFiltrados.forEach((p) => (n[p.id] = flip));
                          setChecked(n);
                        }}
                      />
                    ) : (
                      h.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {pendientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-neutral-400">
                    No hay pedidos pendientes.
                  </td>
                </tr>
              ) : (
                pendientesFiltrados.map((p) => {
                  const sel = repSelect[p.id] || "";
                  const best = pickBestRepartidor(p.estimado_sugerido);
                  const chosen = sel || best || "";
                  const nuevo = chosen ? predictedTotal(chosen, p.estimado_sugerido) : null;
                  const blocked = nuevo !== null && nuevo > QUOTA_MAX_BLOCK;
                  const extras = nuevo !== null && nuevo > QUOTA_EXTRA_START && !blocked;

                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="checkbox"
                          checked={!!checked[p.id]}
                          onChange={(e) => setChecked((c) => ({ ...c, [p.id]: e.target.checked }))}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-[13px] align-middle">#{p.folio}</td>
                      <td className="px-3 py-2 align-middle">
                        <div className="truncate">{p.cliente}</div>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <Chip>{p.estimado_sugerido.toFixed(2)}h</Chip>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <select
                          value={sel}
                          onChange={(e) => setRepSelect((s) => ({ ...s, [p.id]: e.target.value }))}
                          className="w-full rounded-lg bg-neutral-800/70 px-2 py-1 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
                        >
                          <option value="">{best ? `Mejor: ${repMap[best]?.nombre ?? "—"}` : "Seleccionar"}</option>
                          {repartidoresOrdenados.map((r) => {
                            const will = Number(r.totalEstimadoHoy || 0) + p.estimado_sugerido;
                            const dis = will > QUOTA_MAX_BLOCK;
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
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {nuevo !== null ? (
                          <Chip tone={blocked ? "danger" : extras ? "warn" : "ok"}>
                            {nuevo.toFixed(2)}h {blocked ? "• Bloq" : extras ? "• Extra" : "• OK"}
                          </Chip>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right align-middle">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => assignRow(p)}
                            disabled={loading || !chosen || blocked}
                            className="rounded-lg bg-orange-500/20 px-3 py-1.5 text-xs text-orange-200 ring-1 ring-orange-500/30 hover:bg-orange-500/25 disabled:opacity-50"
                            title={blocked ? "Tope alcanzado" : "Asignar"}
                          >
                            Asignar
                          </button>
                          <button
                            onClick={() => {
                              const bestId = pickBestRepartidor(p.estimado_sugerido);
                              if (!bestId) return alert("Sin repartidor disponible debajo del tope.");
                              assignRow({ ...p, id: p.id });
                            }}
                            disabled={loading || !pickBestRepartidor(p.estimado_sugerido)}
                            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-neutral-200 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
                            title="Asignar 1-click (mejor disponible)"
                          >
                            1-click
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lateral: Repartidores (ordenados por capacidad restante) */}
      <aside className="rounded-2xl border border-white/10 bg-neutral-950/40 ring-1 ring-black/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Repartidores</div>
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-lg px-2.5 py-1 text-xs ring-1 ring-white/10 hover:bg-white/5"
          >
            {loading ? "…" : "Refrescar"}
          </button>
        </div>
        <div className="space-y-3">
          {repartidoresOrdenados.map((r) => {
            const v = Number(r.totalEstimadoHoy || 0);
            const rest = Math.max(0, QUOTA_MAX_BLOCK - v);
            const atMax = v >= QUOTA_MAX_BLOCK;
            return (
              <div key={r.id} className="rounded-xl border border-white/10 bg-neutral-900/30 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-[13px] font-medium">{r.nombre}</div>
                  <div className={`text-[11px] ${atMax ? "text-red-300" : "text-neutral-400"}`}>{v.toFixed(2)}h</div>
                </div>
                <Progress value={v} />
                <div className="mt-1 text-[11px] text-neutral-400">Capacidad: {rest.toFixed(2)}h</div>
              </div>
            );
          })}
          {repartidores.length === 0 && <div className="text-neutral-400 text-sm">No hay repartidores activos.</div>}
        </div>
      </aside>

      {/* Dock: Asignados (plegable) */}
      <div className="lg:col-span-2">
        <details className="group rounded-2xl border border-white/10 bg-neutral-950/40 ring-1 ring-black/30">
          <summary className="cursor-pointer select-none list-none px-3 py-2 text-sm font-semibold flex items-center justify-between">
            <span>Pedidos asignados ({asignados.length})</span>
            <span className="text-xs text-neutral-400 group-open:hidden">mostrar</span>
            <span className="text-xs text-neutral-400 hidden group-open:inline">ocultar</span>
          </summary>
          <div className="px-3 pb-3">
            {asignados.length === 0 ? (
              <div className="text-neutral-400 text-sm pb-3">No hay pedidos asignados.</div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {asignados.map((a) => (
                  <div key={a.id} className="rounded-xl border border-white/10 bg-neutral-900/40 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[12px] text-neutral-400">
                          Folio <span className="font-mono text-[12px] text-neutral-200">#{a.folio}</span>
                        </div>
                        <div className="text-[13px] font-medium text-neutral-100">{a.cliente}</div>
                        <div className="text-[11px] text-neutral-400">Repartidor: {a.repartidor_nombre}</div>
                      </div>
                      <Chip>{Number(a.horas ?? 0).toFixed(2)}h</Chip>
                    </div>
                    <div className="mt-2 text-right">
                      <button
                        onClick={() => cancelarAsignacion(a.id)}
                        disabled={loading}
                        className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs text-red-200 ring-1 ring-red-500/30 hover:bg-red-500/25 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
