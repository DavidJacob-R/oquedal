// app/repartidor/rutas/page.tsx
"use client";

import { useEffect, useState } from "react";

type ParadaUI = {
  paradaId: string;
  pedidoId: string;
  folio: number;
  cliente: string;
  origen: string;
  destino: string;
  estado_parada: string;
  estado_pedido: string;
  estado_entrega: string;
  created_at: string | null;
};

type ApiResp = {
  ok: boolean;
  activos?: ParadaUI[];
  finalizados?: ParadaUI[];
  error?: string;
};

export default function RepartidorRutasPage() {
  const [activos, setActivos] = useState<ParadaUI[]>([]);
  const [finalizados, setFinalizados] = useState<ParadaUI[]>([]);
  const [loading, setLoading] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const res = await fetch("/api/repartidor/paradas-hoy", {
        cache: "no-store",
      });
      const data: ApiResp = await res.json();
      if (!res.ok || !data.ok) {
        console.error(data.error || "Error al cargar");
        return;
      }
      setActivos(data.activos || []);
      setFinalizados(data.finalizados || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function finalizar(paradaId: string, pedidoId: string) {
    if (!confirm("¿Marcar este pedido como FINALIZADO?")) return;

    try {
      const res = await fetch("/api/repartidor/pedidos/finalizar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paradaId, pedidoId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Error al finalizar");
        return;
      }

      setActivos((prev) => {
        const remaining: ParadaUI[] = [];
        let moved: ParadaUI | null = null;
        for (const p of prev) {
          if (p.paradaId === paradaId) {
            moved = {
              ...p,
              estado_parada: "completado",
              estado_pedido: "completado",
              estado_entrega: "completo",
            };
          } else {
            remaining.push(p);
          }
        }
        if (moved) {
          setFinalizados((old) => [moved!, ...old]);
        }
        return remaining;
      });
    } catch (e) {
      console.error(e);
      alert("Error de red al finalizar");
    }
  }

  function abrirGoogle(origen: string, destino: string) {
    const o = origen || "";
    const d = destino || "";
    if (!o && !d) return;
    const url = `https://www.google.com/maps/dir/${encodeURIComponent(o)}/${encodeURIComponent(
      d
    )}`;
    window.open(url, "_blank");
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-4xl px-3 py-4 space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Rutas de hoy</h1>
            <p className="text-xs text-neutral-400">
              Solo ves los pedidos del día actual. Al día siguiente, la lista se reinicia.
            </p>
          </div>
          <button
            onClick={cargar}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-xs border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "Cargando…" : "Refrescar"}
          </button>
        </header>

        {/* Sección: En entrega hoy */}
        <section className="rounded-2xl border border-white/10 bg-neutral-900/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold flex items-center gap-2">
              En entrega hoy
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/30">
                {activos.length}
              </span>
            </div>
          </div>

          {activos.length === 0 ? (
            <p className="text-xs text-neutral-400">
              No tienes pedidos activos para hoy.
            </p>
          ) : (
            <div className="space-y-3">
              {activos.map((p) => (
                <div
                  key={p.paradaId}
                  className="rounded-xl border border-white/10 bg-neutral-950/40 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="text-[12px] text-neutral-400">
                      Folio{" "}
                      <span className="font-mono text-[12px] text-neutral-100">
                        #{p.folio}
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold">
                      {p.cliente}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Origen: {p.origen || "—"}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Destino: {p.destino || "—"}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 mt-2 sm:mt-0">
                    <span className="rounded-full px-2 py-1 text-[11px] bg-amber-500/15 text-amber-200 border border-amber-500/40">
                      En ruta
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirGoogle(p.origen, p.destino)}
                        className="rounded-lg px-3 py-1.5 text-[11px] bg-sky-500/20 text-sky-200 border border-sky-500/40"
                      >
                        Ver en mapa
                      </button>
                      <button
                        onClick={() => finalizar(p.paradaId, p.pedidoId)}
                        className="rounded-lg px-3 py-1.5 text-[11px] bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
                      >
                        Finalizar entrega
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sección: Finalizados hoy */}
        <section className="rounded-2xl border border-white/10 bg-neutral-900/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold flex items-center gap-2">
              Finalizados hoy
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
                {finalizados.length}
              </span>
            </div>
          </div>

          {finalizados.length === 0 ? (
            <p className="text-xs text-neutral-400">
              Aún no has finalizado pedidos hoy.
            </p>
          ) : (
            <div className="space-y-3">
              {finalizados.map((p) => (
                <div
                  key={p.paradaId}
                  className="rounded-xl border border-white/10 bg-neutral-950/40 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="text-[12px] text-neutral-400">
                      Folio{" "}
                      <span className="font-mono text-[12px] text-neutral-100">
                        #{p.folio}
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold">
                      {p.cliente}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Origen: {p.origen || "—"}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Destino: {p.destino || "—"}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 mt-2 sm:mt-0">
                    <span className="rounded-full px-2 py-1 text-[11px] bg-emerald-500/15 text-emerald-200 border border-emerald-500/40">
                      Finalizado
                    </span>
                    <button
                      onClick={() => abrirGoogle(p.origen, p.destino)}
                      className="rounded-lg px-3 py-1.5 text-[11px] bg-sky-500/20 text-sky-200 border border-sky-500/40"
                    >
                      Ver en mapa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
