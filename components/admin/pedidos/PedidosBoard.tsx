// components/admin/pedidos/PedidosBoard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type PedidoBase = {
  id: string;
  folio: number;
  created_at: string;
  cliente: string;
  origen: string | null;
  destino: string | null;
  estado_entrega: "pendiente" | "completo" | "incompleto" | string | null;
};
type PedidoPendiente = PedidoBase;
type PedidoConfirmado = PedidoBase & { repartidor: string | null };

function Badge({
  tone = "default",
  children,
}: {
  tone?: "ok" | "warn" | "danger" | "default";
  children: React.ReactNode;
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

function Row({
  folio,
  fecha,
  cliente,
  origen,
  destino,
  derecha,
}: {
  folio: number;
  fecha: string;
  cliente: string;
  origen: string | null;
  destino: string | null;
  derecha?: React.ReactNode;
}) {
  return (
    <article className="group rounded-2xl border border-white/10 bg-neutral-950/40 p-4 ring-1 ring-black/30 hover:bg-neutral-900/40 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[13px] text-neutral-400">
            Folio <span className="font-mono text-[13px] text-neutral-200">#{folio}</span>{" "}
            • {new Date(fecha).toLocaleString("es-MX")}
          </div>
          <div className="text-[15px] font-medium text-neutral-100">{cliente}</div>
          <div className="text-[12px] text-neutral-300">
            <span className="text-neutral-400">Origen:</span>{" "}
            <span className="truncate">{origen || "—"}</span>
          </div>
          <div className="text-[12px] text-neutral-300">
            <span className="text-neutral-400">Destino:</span>{" "}
            <span className="truncate">{destino || "—"}</span>
          </div>
        </div>
        {derecha}
      </div>
    </article>
  );
}

export default function PedidosBoard() {
  const [loading, setLoading] = useState(false);
  const [pendientes, setPendientes] = useState<PedidoPendiente[]>([]);
  const [confirmados, setConfirmados] = useState<PedidoConfirmado[]>([]);
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/pedidos/list", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || "Error");
      setPendientes((j.pendientes || []).map((p: any) => ({ ...p, folio: Number(p.folio || 0) })));
      setConfirmados((j.confirmados || []).map((p: any) => ({ ...p, folio: Number(p.folio || 0) })));
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const pendFiltrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pendientes;
    return pendientes.filter(
      (p) =>
        String(p.folio).includes(s) ||
        (p.cliente || "").toLowerCase().includes(s) ||
        (p.origen || "").toLowerCase().includes(s) ||
        (p.destino || "").toLowerCase().includes(s)
    );
  }, [pendientes, q]);

  const confFiltrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return confirmados;
    return confirmados.filter(
      (p) =>
        String(p.folio).includes(s) ||
        (p.cliente || "").toLowerCase().includes(s) ||
        (p.origen || "").toLowerCase().includes(s) ||
        (p.destino || "").toLowerCase().includes(s) ||
        (p.repartidor || "").toLowerCase().includes(s)
    );
  }, [confirmados, q]);

  return (
    <div className="space-y-8">
      {/* Barra acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Badge> Pendientes: {pendientes.length} </Badge>
          <Badge tone="ok"> Confirmados: {confirmados.length} </Badge>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar folio, cliente, dirección, repartidor…"
            className="w-72 rounded-lg bg-neutral-800/70 px-3 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
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

      {/* Grid 2 columnas: primero Pendientes, luego Confirmados */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pendientes */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Pendientes</h2>
            <span className="text-xs text-neutral-400">Ordenados por registro (más antiguos primero)</span>
          </div>

          {pendFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-400 text-sm">
              No hay pedidos pendientes.
            </div>
          ) : (
            pendFiltrados.map((p) => (
              <Row
                key={p.id}
                folio={p.folio}
                fecha={p.created_at}
                cliente={p.cliente}
                origen={p.origen}
                destino={p.destino}
                derecha={
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={p.estado_entrega === "pendiente" ? "warn" : "default"}>
                      Entrega: {p.estado_entrega ?? "—"}
                    </Badge>
                    <a
                      href={`/admin/pedidos/${p.id}`}
                      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-neutral-200 ring-1 ring-white/10 hover:bg-white/10"
                    >
                      Ver
                    </a>
                  </div>
                }
              />
            ))
          )}
        </section>

        {/* Confirmados (asignados) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Confirmados</h2>
            <span className="text-xs text-neutral-400">Refleja asignaciones (repartidor asignado)</span>
          </div>

          {confFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-400 text-sm">
              No hay pedidos confirmados.
            </div>
          ) : (
            confFiltrados.map((p) => (
              <Row
                key={p.id}
                folio={p.folio}
                fecha={p.created_at}
                cliente={p.cliente}
                origen={p.origen}
                destino={p.destino}
                derecha={
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone="ok">{p.repartidor ? `Repartidor: ${p.repartidor}` : "Sin repartidor"}</Badge>
                    <Badge tone={p.estado_entrega === "pendiente" ? "warn" : "default"}>
                      Entrega: {p.estado_entrega ?? "—"}
                    </Badge>
                    <a
                      href={`/admin/pedidos/${p.id}`}
                      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-neutral-200 ring-1 ring-white/10 hover:bg-white/10"
                    >
                      Ver
                    </a>
                  </div>
                }
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
