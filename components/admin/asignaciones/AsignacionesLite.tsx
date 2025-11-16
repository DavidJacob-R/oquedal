// components/admin/asignaciones/AsignacionesPro.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
      o?.repartidor_user_id ??
      o?.asignado_a ??
      ""
  );
}

function getNombreRepartidor(o: any): string {
  return (
    o?.repartidor_nombre ??
    o?.nombre_repartidor ??
    o?.nombre ??
    o?.repartidor ??
    "Repartidor"
  );
}

/* UI pequeños componentes */
function Progress({ value }: { value: number }) {
  const v = Number(value ?? 0);
  const pct = Math.max(0, Math.min(100, (v / QUOTA_MAX_BLOCK) * 100));
  const danger = v > QUOTA_EXTRA_START;
  const warn = !danger && v > 7.5;
  const barCls = danger ? "bg-amber-500/70" : warn ? "bg-amber-500/70" : "bg-emerald-500/70";
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden ring-1 ring-black/30">
      <div className={`h-full ${barCls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "ok" | "warn" | "danger" | "default";
}) {
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
      const restA = QUOTA_MAX_BLOCK - Number(a.totalHoras || 0);
      const restB = QUOTA_MAX_BLOCK - Number(b.totalHoras || 0);
      return restB - restA;
    });
  }, [repartidores]);

  const pendientesFiltrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pendientes;
    return pendientes.filter(
      (p) =>
        String(p.folio).includes(s) ||
        (p.cliente || "").toLowerCase().includes(s)
    );
  }, [pendientes, q]);

  const allCheckedOnPage = useMemo(
    () =>
      pendientesFiltrados.length > 0 &&
      pendientesFiltrados.every((p) => checked[p.id]),
    [pendientesFiltrados, checked]
  );

  /** CARGA INICIAL: usamos tus endpoints, pero SOLO para llenar listas.
   *  Las horas de los repartidores las vamos a recalcular en el front.
   */
  async function refresh() {
    setLoading(true);
    try {
      const [rp, pp, aa] = await Promise.all([
        fetch("/api/admin/empleados/repartidores", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/asignaciones/pendientes", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/asignaciones/asignados", { cache: "no-store" }).then((r) => r.json()),
      ]);

      // 1) Repartidores BASE (inicialmente con 0 horas, luego las llenamos usando 'asignados')
      const baseReps: Repartidor[] = (rp.repartidores || rp.empleados || []).map((r: any) => ({
        id: getId(r),
        nombre: r.nombre ?? getNombreRepartidor(r),
        totalHoras: 0,
      }));

      // 2) Pendientes
      const pend: PedidoPend[] = (pp.pedidos || []).map((p: any) => ({
        id: String(p.id),
        folio: Number(p.folio ?? 0),
        created_at: p.created_at ?? "",
        cliente: p.cliente ?? p.nombre_cliente ?? "",
        estimado_sugerido: Number(p.estimado_sugerido ?? 0),
      }));

      // 3) Asignados: si tu API no manda horas, las ponemos en 0 (solo para los ya viejos).
      const asigRaw: any[] = aa.asignados || [];
      const asig: PedidoAsignado[] = asigRaw.map((a: any) => ({
        id: String(a.id),
        folio: Number(a.folio ?? 0),
        created_at: a.created_at ?? a.creado_en ?? "",
        cliente: a.cliente ?? a.nombre_cliente ?? "",
        repartidor_id: getId({
          repartidor_id: a.repartidor_id,
          usuario_id: a.usuario_id,
          asignado_a: a.asignado_a,
        }),
        repartidor_nombre: getNombreRepartidor(a),
        // si tu API no trae horas, aqui será 0; LAS NUEVAS ASIGNACIONES ya no serán 0
        horas: Number(
          a.horas ??
            a.estimado_sugerido ??
            a.estimado ??
            0
        ),
      }));

      // 4) Recalcular totalHoras por repartidor SOLO usando asignados que tengan horas > 0
      const tot: Record<string, number> = {};
      for (const a of asig) {
        if (!a.repartidor_id) continue;
        const h = Number(a.horas || 0);
        if (!h) continue;
        tot[a.repartidor_id] = (tot[a.repartidor_id] ?? 0) + h;
      }

      const repIndex = new Map<string, Repartidor>(
        baseReps.map((r) => [r.id, r])
      );
      // por si en asignados aparece alguien que no existe en la lista base
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
        totalHoras: Number(tot[r.id] ?? 0),
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

  /** Asignar UN pedido */
  async function doAssign(p: PedidoPend, repId: string) {
    const nuevoTotal = predictedTotal(repId, p.estimado_sugerido);
    if (nuevoTotal !== null && nuevoTotal > QUOTA_MAX_BLOCK) {
      alert(`No permitido (> ${QUOTA_MAX_BLOCK.toFixed(2)}h).`);
      return false;
    }

    const res = await fetch("/api/admin/asignaciones/assign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Mantengo TU contrato: repartidorUserId
      body: JSON.stringify({ pedidoId: p.id, repartidorUserId: repId }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      alert(data?.error || "Error al asignar");
      return false;
    }

    setRepartidores((prev) =>
      prev.map((r) =>
        r.id === repId
          ? {
              ...r,
              totalHoras: Number(r.totalHoras || 0) + Number(p.estimado_sugerido || 0),
            }
          : r
      )
    );

    // 2) Mover el pedido de "pendientes" a "asignados"
    setPendientes((prev) => prev.filter((x) => x.id !== p.id));

    const repName = repMap[repId]?.nombre ?? "Repartidor";

    setAsignados((prev) => [
      ...prev,
      {
        id: p.id,
        folio: p.folio,
        created_at: p.created_at,
        cliente: p.cliente,
        repartidor_id: repId,
        repartidor_nombre: repName,
        horas: Number(p.estimado_sugerido || 0), // 👈 AQUI YA NUNCA SERÁ 0 SI TENIAS ESTIMADO
      },
    ]);

    return true;
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

  /** Asignación masiva */
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

  /** Cancelar asignación */
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

      // Buscar el pedido asignado en el estado actual
      const asignado = asignados.find((a) => a.id === pedidoId);
      if (asignado) {
        const { repartidor_id, horas } = asignado;

        // 1) Restar horas al repartidor
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

        // 2) Quitar de la lista de asignados
        setAsignados((prev) => prev.filter((a) => a.id !== pedidoId));
      }

      // (Opcional) podrías volver a meter el pedido a pendientes, si tu flujo lo requiere
      // pero como no tenemos todos los campos del pedido aqui, lo dejamos así.
    } finally {
      setLoading(false);
    }
  }

  /* UI */
  return (
    <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
      {/* PANE PRINCIPAL: Pendientes */}
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
          <table className="w-full min-w-[980px] text-sm table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: 44 }} />
              <col style={{ width: 100 }} />
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
                  const nuevo =
                    chosen != null
                      ? predictedTotal(chosen, p.estimado_sugerido)
                      : null;
                  const blocked = nuevo !== null && nuevo > QUOTA_MAX_BLOCK;
                  const extras =
                    nuevo !== null && nuevo > QUOTA_EXTRA_START && !blocked;

                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
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
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-[13px] align-middle">
                        #{p.folio}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="truncate">{p.cliente}</div>
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
                          className="w-full rounded-lg bg-neutral-800/70 px-2 py-1 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
                        >
                          <option value="">
                            {best
                              ? `Mejor: ${repMap[best]?.nombre ?? "—"}`
                              : "Seleccionar"}
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
                          <Chip
                            tone={
                              blocked
                                ? "danger"
                                : extras
                                ? "warn"
                                : "ok"
                            }
                          >
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
                        <div className="inline-flex items-center gap-2">
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
                            }  className="rounded-lg bg-orange-500/20 px-3 py-1.5 text-xs text-orange-200 ring-1 ring-orange-500/30 hover:bg-orange-500/25 disabled:opacity-50"
                          >
                            Asignar
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

      {/* PANEL LATERAL: Repartidores con barra */}
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
            const v = Number(r.totalHoras || 0);
            const rest = Math.max(0, QUOTA_MAX_BLOCK - v);
            const atMax = v >= QUOTA_MAX_BLOCK;
            return (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-neutral-900/30 p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-[13px] font-medium">
                    {r.nombre}
                  </div>
                  <div
                    className={`text-[11px] ${
                      atMax ? "text-red-300" : "text-neutral-400"
                    }`}
                  >
                    {v.toFixed(2)}h
                  </div>
                </div>
                <Progress value={v} />
                <div className="mt-1 text-[11px] text-neutral-400">
                  Capacidad: {rest.toFixed(2)}h
                </div>
              </div>
            );
          })}
          {repartidores.length === 0 && (
            <div className="text-neutral-400 text-sm">
              No hay repartidores activos.
            </div>
          )}
        </div>
      </aside>

      {/* DOCK: Asignados */}
      <div className="lg:col-span-2">
        <details className="group rounded-2xl border border-white/10 bg-neutral-950/40 ring-1 ring-black/30">
          <summary className="cursor-pointer select-none list-none px-3 py-2 text-sm font-semibold flex items-center justify-between">
            <span>Pedidos asignados ({asignados.length})</span>
            <span className="text-xs text-neutral-400 group-open:hidden">
              mostrar
            </span>
            <span className="text-xs text-neutral-400 hidden group-open:inline">
              ocultar
            </span>
          </summary>
          <div className="px-3 pb-3">
            {asignados.length === 0 ? (
              <div className="text-neutral-400 text-sm pb-3">
                No hay pedidos asignados.
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {asignados.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-white/10 bg-neutral-900/40 p-3"
                  >
                    <div className="flex items-start justify-between">
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