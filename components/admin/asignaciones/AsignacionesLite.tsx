// components/admin/asignaciones/AsignacionesLite.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { QUOTA_EXTRA_START, QUOTA_MAX_BLOCK } from "@/lib/quota";

/* Tipos */
type Repartidor = {
  id: string;
  nombre: string;
  totalHoras: number;
};

type PedidoPend = {
  id: string;
  folio: number;
  created_at: string;
  cliente: string;
  estimado_sugerido: number;
};

type PedidoAsignado = {
  id: string; // id del pedido
  folio: number;
  created_at: string;
  cliente: string;
  repartidor_id: string;
  repartidor_nombre: string;
  horas: number; // horas estimadas que usamos en la barrita
};

/* Helpers para adaptarnos a lo que devuelve tu API */
function getId(o: any): string {
  return String(
    o?.id ??
      o?.usuario_id ??
      o?.user_id ??
      o?.repartidor_id ??
      o?.pedido_id ??
      ""
  );
}

function getNombre(o: any): string {
  return (
    o?.nombre ??
    o?.repartidor_nombre ??
    o?.nombre_repartidor ??
    o?.cliente ??
    o?.nombre_cliente ??
    "Sin nombre"
  );
}

function Progress({ value }: { value: number }) {
  const v = Number(value ?? 0);
  const pct = Math.max(0, Math.min(100, (v / QUOTA_MAX_BLOCK) * 100));
  const danger = v > QUOTA_EXTRA_START;
  const warn = !danger && v > 7.5;
  const barCls = danger ? "bg-amber-500/70" : warn ? "bg-amber-500/70" : "bg-emerald-500/70";

  return (
    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden ring-1 ring-black/30">
      <div className={`h-full ${barCls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Chip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "danger" | "default";
}) {
  const cls =
    tone === "danger"
      ? "ring-red-500/40 text-red-200 bg-red-500/10"
      : tone === "warn"
      ? "ring-amber-500/40 text-amber-200 bg-amber-500/10"
      : tone === "ok"
      ? "ring-emerald-500/40 text-emerald-200 bg-emerald-500/10"
      : "ring-white/10 text-neutral-100 bg-white/5";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${cls}`}>
      {children}
    </span>
  );
}

/** Intenta obtener las horas de distintos campos que pueda mandar el backend */
function pickHorasFromAsignado(a: any): number {
  const candidates = [
    a.horas,
    a.estimado_hoy,
    a.estimado_sugerido,
    a.estimado,
    a.horas_est,
  ];

  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return 0;
}

export default function AsignacionesLite() {
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
      const restA = QUOTA_MAX_BLOCK - Number(a.totalHoras || 0);
      const restB = QUOTA_MAX_BLOCK - Number(b.totalHoras || 0);
      return restB - restA;
    });
  }, [repartidores]);

  const pendientesFiltrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return pendientes;
    return pendientes.filter((p) => {
      const folioStr = String(p.folio || "");
      const cliente = (p.cliente || "").toLowerCase();
      return folioStr.includes(term) || cliente.includes(term);
    });
  }, [pendientes, q]);

  const allCheckedOnPage = useMemo(() => {
    if (!pendientesFiltrados.length) return false;
    return pendientesFiltrados.every((p) => checked[p.id]);
  }, [pendientesFiltrados, checked]);

  const totalHorasUsadas = useMemo(
    () => repartidores.reduce((sum, r) => sum + Number(r.totalHoras || 0), 0),
    [repartidores]
  );

  const totalCapacidad = repartidores.length * QUOTA_MAX_BLOCK;

  async function refresh() {
    setLoading(true);
    try {
      const [repsRes, pendRes, asigRes] = await Promise.all([
        fetch("/api/admin/empleados/repartidores"),
        fetch("/api/admin/asignaciones/pendientes"),
        fetch("/api/admin/asignaciones/asignados"),
      ]);

      const [repsData, pp, aa] = await Promise.all([
        repsRes.json(),
        pendRes.json(),
        asigRes.json(),
      ]);

      const baseReps: any[] = repsData?.repartidores || repsData?.rows || [];
      const repartidoresBase: Repartidor[] = baseReps.map((r) => ({
        id: getId(r),
        nombre: getNombre(r),
        totalHoras: 0,
      }));

      const asignadosRaw: any[] = aa?.asignados || [];
      const tot: Record<string, number> = {};

      const asig: PedidoAsignado[] = asignadosRaw.map((a) => {
        const rid = String(a.repartidor_id || a.asignado_a || a.user_id || "");
        const horas = pickHorasFromAsignado(a); // <- AQUI SE ARREGLA EL TEMA DE HORAS

        if (rid && horas > 0) {
          tot[rid] = (tot[rid] || 0) + horas;
        }

        return {
          id: String(a.id),
          folio: Number(a.folio ?? 0),
          created_at: a.created_at ?? "",
          cliente: a.cliente ?? a.nombre_cliente ?? "",
          repartidor_id: rid,
          repartidor_nombre: a.repartidor_nombre ?? a.nombre_repartidor ?? "",
          horas,
        };
      });

      // Mezclamos repartidores base con las horas calculadas de pedidos asignados
      const repIndex = new Map<string, Repartidor>(
        repartidoresBase.map((r) => [r.id, r])
      );

      for (const a of asig) {
        if (!a.repartidor_id) continue;
        if (!repIndex.has(a.repartidor_id)) {
          repIndex.set(a.repartidor_id, {
            id: a.repartidor_id,
            nombre: a.repartidor_nombre || "Repartidor",
            totalHoras: 0,
          });
        }
      }

      const finalReps = Array.from(repIndex.values()).map((r) => ({
        ...r,
        totalHoras: Number(tot[r.id] || 0),
      }));

      const pend: PedidoPend[] = (pp.pedidos || []).map((p: any) => ({
        id: String(p.id),
        folio: Number(p.folio ?? 0),
        created_at: p.created_at ?? "",
        cliente: p.cliente ?? p.nombre_cliente ?? "",
        estimado_sugerido: Number(p.estimado_sugerido ?? 0),
      }));

      setRepartidores(finalReps);
      setPendientes(pend);
      setAsignados(asig);
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
    return Number(r.totalHoras || 0) + Number(estimado || 0);
  }

  function pickBestRepartidor(estimado: number): string | null {
    let bestId: string | null = null;
    let bestTotal = Number.POSITIVE_INFINITY;
    for (const r of repartidores) {
      const t = Number(r.totalHoras || 0) + Number(estimado || 0);
      if (t <= QUOTA_MAX_BLOCK && t < bestTotal) {
        bestTotal = t;
        bestId = r.id;
      }
    }
    return bestId;
  }

  async function doAssign(p: PedidoPend, repartidorId: string): Promise<boolean> {
    try {
      const res = await fetch("/api/admin/asignaciones/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pedidoId: p.id, repartidorUserId: repartidorId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        alert(data?.error || "No se pudo asignar el pedido.");
        return false;
      }

      // Intentamos usar la hora que devuelva el backend; si no, usamos el estimado_sugerido
      const horas = Number(
        data?.horas ?? p.estimado_sugerido ?? 0
      );

      setRepartidores((prev) =>
        prev.map((r) =>
          r.id === repartidorId
            ? { ...r, totalHoras: Number(r.totalHoras || 0) + horas }
            : r
        )
      );

      setPendientes((prev) => prev.filter((x) => x.id !== p.id));

      setAsignados((prev) => [
        ...prev,
        {
          id: p.id,
          folio: p.folio,
          created_at: p.created_at,
          cliente: p.cliente,
          repartidor_id: repartidorId,
          repartidor_nombre: repMap[repartidorId]?.nombre || "Repartidor",
          horas,
        },
      ]);

      return true;
    } catch (e: any) {
      console.error(e);
      alert("Error al asignar pedido.");
      return false;
    }
  }

  async function assignRow(p: PedidoPend) {
    setLoading(true);
    try {
      const sel = repSelect[p.id] || "";
      const best = pickBestRepartidor(p.estimado_sugerido);
      const target = sel || best;
      if (!target) {
        alert("Sin repartidor disponible debajo del tope.");
        return;
      }
      await doAssign(p, target);
    } finally {
      setLoading(false);
    }
  }

  async function cancelPedido(p: PedidoPend) {
    if (!confirm("¿Cancelar este pedido?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pedidos/estado", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: p.id, estado: "cancelado_por_admin" }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        alert(data?.msg || data?.error || "No se pudo cancelar el pedido.");
        return;
      }

      setPendientes((prev) => prev.filter((x) => x.id !== p.id));

      setRepSelect((prev) => {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      });
      setChecked((prev) => {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  async function bulkAssign() {
    const ids = pendientesFiltrados.filter((p) => checked[p.id]).map((p) => p.id);
    if (!ids.length) {
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
        const ok = await doAssign(p, best);
        if (ok) {
          okCount++;
          setChecked((c) => ({ ...c, [p.id]: false }));
        } else {
          failCount++;
        }
      }

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
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Error al cancelar");
        return;
      }

      const asignado = asignados.find((a) => a.id === pedidoId);
      if (asignado) {
        const { repartidor_id, horas } = asignado;

        setRepartidores((prev) =>
          prev.map((r) =>
            r.id === repartidor_id
              ? {
                  ...r,
                  totalHoras: Math.max(
                    0,
                    Number(r.totalHoras || 0) - Number(horas || 0)
                  ),
                }
              : r
          )
        );

        setAsignados((prev) => prev.filter((a) => a.id !== pedidoId));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Resumen superior */}
      <section className="rounded-2xl border border-white/10 bg-neutral-950/60 px-4 py-4 ring-1 ring-black/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-neutral-50">
              Panel de asignaciones
            </h1>
            <p className="text-[11px] text-neutral-400 max-w-xl">
              Administra los pedidos pendientes, la carga de trabajo de los repartidores
              y las asignaciones del dia de una forma mas ordenada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <div className="rounded-xl bg-neutral-900/80 px-3 py-2 ring-1 ring-white/10">
              <div className="text-neutral-400">Pendientes</div>
              <div className="text-sm font-semibold text-neutral-50">
                {pendientes.length}
              </div>
            </div>
            <div className="rounded-xl bg-neutral-900/80 px-3 py-2 ring-1 ring-white/10">
              <div className="text-neutral-400">Asignados</div>
              <div className="text-sm font-semibold text-neutral-50">
                {asignados.length}
              </div>
            </div>
            <div className="rounded-xl bg-neutral-900/80 px-3 py-2 ring-1 ring-white/10">
              <div className="text-neutral-400">Capacidad usada</div>
              <div className="text-sm font-semibold text-neutral-50">
                {totalCapacidad > 0
                  ? `${((totalHorasUsadas / totalCapacidad) * 100).toFixed(0)}%`
                  : "0%"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Layout principal */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]">
        {/* Pendientes y acciones */}
        <section className="rounded-2xl border border-white/10 bg-neutral-950/60 ring-1 ring-black/30">
          {/* Toolbar */}
          <div className="border-b border-white/10 px-4 py-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-neutral-50">
                  Pedidos pendientes
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Revisa los pedidos y asignalos manualmente o con el modo automatico.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por folio o nombre de cliente…"
                className="min-w-[200px] flex-1 rounded-lg bg-neutral-900/80 px-3 py-1.5 text-[12px] ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
              />
              <button
                onClick={() => {
                  const flip = !allCheckedOnPage;
                  const n: Record<string, boolean> = { ...checked };
                  pendientesFiltrados.forEach((p) => (n[p.id] = flip));
                  setChecked(n);
                }}
                className="rounded-lg px-3 py-1.5 text-[12px] ring-1 ring-white/10 hover:bg-white/5"
              >
                {allCheckedOnPage ? "Deseleccionar pagina" : "Seleccionar pagina"}
              </button>
              <button
                onClick={bulkAssign}
                disabled={loading}
                className="rounded-lg bg-orange-500/20 px-3 py-1.5 text-[12px] ring-1 ring-orange-500/30 hover:bg-orange-500/25 disabled:opacity-50"
              >
                Asignar auto
              </button>
              <button
                onClick={refresh}
                disabled={loading}
                className="rounded-lg px-3 py-1.5 text-[12px] ring-1 ring-white/10 hover:bg-white/5 disabled:opacity-50"
              >
                Refrescar
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[10px] text-neutral-400">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                Dentro de tope
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500/70" />
                En zona extra
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500/70" />
                Sobre tope (bloqueado)
              </span>
            </div>
          </div>

          {/* Tabla pendientes */}
          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-full text-left text-[12px]">
              <thead className="sticky top-0 z-10 bg-neutral-950/95 text-[11px] uppercase tracking-wide text-neutral-400 backdrop-blur">
                <tr>
                  <th className="w-8 px-3 py-2">
                    <span className="sr-only">Sel</span>
                  </th>
                  <th className="w-20 px-3 py-2">Folio</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="w-24 px-3 py-2">Estimado</th>
                  <th className="w-52 px-3 py-2">Repartidor</th>
                  <th className="w-36 px-3 py-2">Total estimado</th>
                  <th className="w-40 px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientesFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-neutral-400"
                    >
                      No hay pedidos pendientes.
                    </td>
                  </tr>
                ) : (
                  pendientesFiltrados.map((p) => {
                    const sel = repSelect[p.id] || "";
                    const best = pickBestRepartidor(p.estimado_sugerido);
                    const chosen = sel || best || "";
                    const nuevo =
                      chosen != null
                        ? predictedTotal(chosen, p.estimado_sugerido)
                        : null;

                    const blocked = nuevo != null && nuevo > QUOTA_MAX_BLOCK;
                    const extras =
                      nuevo != null && nuevo > QUOTA_EXTRA_START;

                    const tono =
                      blocked ? "danger" : extras ? "warn" : "ok";

                    return (
                      <tr
                        key={p.id}
                        className="border-t border-white/5 hover:bg-neutral-900/60"
                      >
                        <td className="px-3 py-2 align-middle">
                          <input
                            type="checkbox"
                            checked={!!checked[p.id]}
                            onChange={(e) =>
                              setChecked((c) => ({
                                ...c,
                                [p.id]: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-orange-500"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-[13px] align-middle">
                          #{p.folio}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="truncate">{p.cliente}</div>
                          <div className="mt-0.5 text-[10px] text-neutral-500">
                            {new Date(p.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <Chip>{p.estimado_sugerido.toFixed(2)}h</Chip>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <select
                            value={sel}
                            onChange={(e) =>
                              setRepSelect((s) => ({
                                ...s,
                                [p.id]: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg bg-neutral-900/80 px-2 py-1.5 text-[12px] ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
                          >
                            <option value="">
                              {best
                                ? `Mejor opcion: ${
                                    repMap[best]?.nombre ?? "—"
                                  }`
                                : "Seleccionar repartidor"}
                            </option>
                            {repartidoresOrdenados.map((r) => {
                              const will =
                                Number(r.totalHoras || 0) +
                                p.estimado_sugerido;
                              const dis = will > QUOTA_MAX_BLOCK;
                              const tag =
                                Number(r.totalHoras || 0) >= QUOTA_MAX_BLOCK
                                  ? " • tope"
                                  : dis
                                  ? " • excede"
                                  : "";
                              return (
                                <option key={r.id} value={r.id} disabled={dis}>
                                  {r.nombre} —{" "}
                                  {Number(r.totalHoras || 0).toFixed(2)}h
                                  {tag}
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          {nuevo !== null ? (
                            <Chip tone={tono}>
                              {nuevo.toFixed(2)}h{" "}
                              {blocked
                                ? "• Bloq"
                                : extras
                                ? "• Extra"
                                : "• OK"}
                            </Chip>
                          ) : (
                            <span className="text-neutral-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right align-middle">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                const bestId = pickBestRepartidor(
                                  p.estimado_sugerido
                                );
                                if (!bestId) {
                                  alert(
                                    "Sin repartidor disponible debajo del tope."
                                  );
                                  return;
                                }
                                assignRow(p);
                              }}
                              disabled={
                                loading ||
                                !pickBestRepartidor(p.estimado_sugerido)
                              }
                              className="rounded-lg bg-orange-500/20 px-3 py-1.5 text-xs ring-1 ring-orange-500/30 hover:bg-orange-500/25 disabled:opacity-50"
                            >
                              Asignar
                            </button>
                            <button
                              onClick={() => cancelPedido(p)}
                              disabled={loading}
                              className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs ring-1 ring-red-500/30 hover:bg-red-500/25 disabled:opacity-50"
                            >
                              Cancelar
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

        {/* Sidebar: repartidores y asignados */}
        <aside className="space-y-4">
          {/* Capacidad de repartidores */}
          <section className="rounded-2xl border border-white/10 bg-neutral-950/60 ring-1 ring-black/30">
            <details open>
              <summary className="flex cursor-pointer items-center justify-between gap-2 border-b border-white/10 px-4 py-3 text-sm font-semibold text-neutral-100">
                <span>Capacidad de repartidores (hoy)</span>
                <span className="text-[11px] font-normal text-neutral-400">
                  Tope: {QUOTA_MAX_BLOCK.toFixed(2)}h • Extra:{" "}
                  {QUOTA_EXTRA_START.toFixed(2)}h
                </span>
              </summary>
              <div className="p-4">
                {repartidores.length === 0 ? (
                  <p className="text-[12px] text-neutral-400">
                    No hay repartidores configurados.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {repartidoresOrdenados.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-white/10 bg-neutral-900/60 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[13px] font-medium text-neutral-50">
                              {r.nombre}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              {Number(r.totalHoras || 0).toFixed(2)}h /{" "}
                              {QUOTA_MAX_BLOCK.toFixed(2)}h
                            </div>
                          </div>
                          <Chip
                            tone={
                              Number(r.totalHoras || 0) > QUOTA_MAX_BLOCK
                                ? "danger"
                                : Number(r.totalHoras || 0) > QUOTA_EXTRA_START
                                ? "warn"
                                : "ok"
                            }
                          >
                            {Number(r.totalHoras || 0).toFixed(2)}h
                          </Chip>
                        </div>
                        <div className="mt-2">
                          <Progress value={Number(r.totalHoras || 0)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </section>

          {/* Pedidos asignados */}
          <section className="rounded-2xl border border-white/10 bg-neutral-950/60 ring-1 ring-black/30">
            <details open>
              <summary className="flex cursor-pointer items-center justify-between gap-2 border-b border-white/10 px-4 py-3 text-sm font-semibold text-neutral-100">
                <span>Pedidos asignados</span>
                <span className="text-[11px] font-normal text-neutral-400">
                  {asignados.length} en total
                </span>
              </summary>
              <div className="p-4">
                {asignados.length === 0 ? (
                  <p className="text-[12px] text-neutral-400">
                    No hay pedidos asignados en este momento.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                    {asignados.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-xl border border-white/10 bg-neutral-900/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[12px] text-neutral-400">
                              Folio{" "}
                              <span className="font-mono text-[12px] text-neutral-200">
                                #{a.folio}
                              </span>
                            </div>
                            <div className="text-[13px] font-medium text-neutral-100">
                              {a.cliente}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              Repartidor: {a.repartidor_nombre}
                            </div>
                          </div>
                          <Chip>{Number(a.horas ?? 0).toFixed(2)}h</Chip>
                        </div>
                        <div className="mt-2 text-right">
                          <button
                            onClick={() => cancelarAsignacion(a.id)}
                            disabled={loading}
                            className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs ring-1 ring-red-500/30 hover:bg-red-500/25 disabled:opacity-50"
                          >
                            Cancelar asignacion
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </section>
        </aside>
      </div>
    </div>
  );
}
