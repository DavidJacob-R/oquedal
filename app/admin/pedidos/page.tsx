// app/admin/pedidos/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PedidoAdmin = {
  id: string;
  folio: number;
  fecha: string | null;
  created_at: string | null;
  estado: string;
  estado_entrega: string;
  cliente: string;
  origen: string;
  destino: string;
  asignado_a: string | null;
  repartidor: string;
};

type ApiResp = {
  ok: boolean;
  pendientes?: PedidoAdmin[];
  asignados?: PedidoAdmin[];
  cancelados?: PedidoAdmin[];
  finalizados?: PedidoAdmin[];
  error?: string;
};

type Tab = "pendientes" | "asignados" | "cancelados" | "finalizados";

function estadoBadge(p: PedidoAdmin) {
  const e = p.estado;
  const ee = p.estado_entrega;

  if (e === "cancelado") {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] bg-red-500/15 text-red-200 border border-red-500/40">
        Cancelado
      </span>
    );
  }
  if (e === "completado" || ee === "completo") {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] bg-emerald-500/15 text-emerald-200 border border-emerald-500/40">
        Finalizado
      </span>
    );
  }
  if (p.asignado_a) {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] bg-sky-500/15 text-sky-200 border border-sky-500/40">
        Asignado
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] bg-amber-500/15 text-amber-200 border border-amber-500/40">
      Pendiente
    </span>
  );
}

export default function AdminPedidosPage() {
  const [tab, setTab] = useState<Tab>("pendientes");
  const [pendientes, setPendientes] = useState<PedidoAdmin[]>([]);
  const [asignados, setAsignados] = useState<PedidoAdmin[]>([]);
  const [cancelados, setCancelados] = useState<PedidoAdmin[]>([]);
  const [finalizados, setFinalizados] = useState<PedidoAdmin[]>([]);
  const [loading, setLoading] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pedidos/listado", {
        cache: "no-store",
      });
      const data: ApiResp = await res.json();
      if (!res.ok || !data.ok) {
        console.error(data.error || "Error al cargar pedidos");
        return;
      }
      setPendientes(data.pendientes || []);
      setAsignados(data.asignados || []);
      setCancelados(data.cancelados || []);
      setFinalizados(data.finalizados || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function tabla(pedidos: PedidoAdmin[]) {
    if (pedidos.length === 0) {
      return (
        <div className="py-6 text-center text-sm text-neutral-400">
          No hay pedidos en esta categoría.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-neutral-400">
              <th className="text-left px-3 py-2 border-b border-white/10">
                Folio
              </th>
              <th className="text-left px-3 py-2 border-b border-white/10">
                Cliente
              </th>
              <th className="text-left px-3 py-2 border-b border-white/10">
                Repartidor
              </th>
              <th className="text-left px-3 py-2 border-b border-white/10">
                Fecha
              </th>
              <th className="text-left px-3 py-2 border-b border-white/10">
                Origen
              </th>
              <th className="text-left px-3 py-2 border-b border-white/10">
                Destino
              </th>
              <th className="text-left px-3 py-2 border-b border-white/10">
                Estado
              </th>
              <th className="text-right px-3 py-2 border-b border-white/10">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr
                key={p.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="px-3 py-2 font-mono text-[13px]">#{p.folio}</td>
                <td className="px-3 py-2">
                  <div className="truncate max-w-[160px]">
                    {p.cliente || "—"}
                  </div>
                </td>
                <td className="px-3 py-2 text-[12px] text-neutral-300">
                  <div className="truncate max-w-[140px]">
                    {p.asignado_a ? p.repartidor || "Sin nombre" : "—"}
                  </div>
                </td>
                <td className="px-3 py-2 text-[12px] text-neutral-400">
                  {p.fecha || "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="truncate max-w-[160px] text-[12px]">
                    {p.origen || "—"}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="truncate max-w-[160px] text-[12px]">
                    {p.destino || "—"}
                  </div>
                </td>
                <td className="px-3 py-2">{estadoBadge(p)}</td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/pedidos/${p.id}`}
                    className="inline-flex items-center rounded-lg px-3 py-1.5 text-[12px] border border-white/10 bg-white/5 hover:bg-white/10"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const current: PedidoAdmin[] =
    tab === "pendientes"
      ? pendientes
      : tab === "asignados"
      ? asignados
      : tab === "cancelados"
      ? cancelados
      : finalizados;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Pedidos</h1>
            <p className="text-xs text-neutral-400">
              Vista ordenada por estado: pendientes, asignados, cancelados y
              finalizados.
            </p>
          </div>
          <button
            onClick={cargar}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-xs border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "Actualizando…" : "Refrescar"}
          </button>
        </header>

        {/* Tabs */}
        <div className="inline-flex rounded-xl border border-white/10 bg-neutral-900/60 p-1 text-[12px]">
          <button
            onClick={() => setTab("pendientes")}
            className={`px-3 py-1.5 rounded-lg ${
              tab === "pendientes"
                ? "bg-white text-neutral-900"
                : "text-neutral-300 hover:bg-white/5"
            }`}
          >
            Pendientes ({pendientes.length})
          </button>
          <button
            onClick={() => setTab("asignados")}
            className={`px-3 py-1.5 rounded-lg ${
              tab === "asignados"
                ? "bg-white text-neutral-900"
                : "text-neutral-300 hover:bg-white/5"
            }`}
          >
            Asignados ({asignados.length})
          </button>
          <button
            onClick={() => setTab("cancelados")}
            className={`px-3 py-1.5 rounded-lg ${
              tab === "cancelados"
                ? "bg-white text-neutral-900"
                : "text-neutral-300 hover:bg-white/5"
            }`}
          >
            Cancelados ({cancelados.length})
          </button>
          <button
            onClick={() => setTab("finalizados")}
            className={`px-3 py-1.5 rounded-lg ${
              tab === "finalizados"
                ? "bg-white text-neutral-900"
                : "text-neutral-300 hover:bg-white/5"
            }`}
          >
            Finalizados ({finalizados.length})
          </button>
        </div>

        {/* Tabla según pestaña */}
        <section className="rounded-2xl border border-white/10 bg-neutral-900/40 p-3">
          {tabla(current)}
        </section>
      </div>
    </main>
  );
}
