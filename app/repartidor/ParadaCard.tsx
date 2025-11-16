// components/repartidor/ParadaCard.tsx
"use client";

type Parada = {
  paradaId: string;
  pedidoId: string;
  folio: number;
  cliente: string;
  direccion_origen?: string;
  direccion_destino?: string;
  estado: string; // 'pendiente', 'en_ruta', 'completado'
};

type Props = {
  data: Parada;
  onFinalizado?: (paradaId: string) => void;
};

export default function ParadaCard({ data, onFinalizado }: Props) {
  const isDone = data.estado === "completado";

  async function handleFinalizar() {
    if (!confirm("¿Marcar este pedido como FINALIZADO?")) return;

    try {
      const res = await fetch("/api/repartidor/pedidos/finalizar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paradaId: data.paradaId,
          pedidoId: data.pedidoId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        alert(json?.error || "Error al finalizar");
        return;
      }

      if (onFinalizado) onFinalizado(data.paradaId);
    } catch (e) {
      console.error(e);
      alert("Error de red al finalizar");
    }
  }

  function openGoogle() {
    if (!data.direccion_origen && !data.direccion_destino) return;
    const q = encodeURIComponent(
      `${data.direccion_origen || ""} a ${data.direccion_destino || ""}`
    );
    window.open(`https://www.google.com/maps/dir/${q}`, "_blank");
  }

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-3">
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="text-[12px] text-neutral-400">
            Folio{" "}
            <span className="font-mono text-[12px] text-neutral-200">
              #{data.folio}
            </span>
          </div>
          <div className="text-[13px] font-semibold text-neutral-100">
            {data.cliente}
          </div>
          {data.direccion_origen && (
            <div className="text-[11px] text-neutral-400 mt-1">
              Origen: {data.direccion_origen}
            </div>
          )}
          {data.direccion_destino && (
            <div className="text-[11px] text-neutral-400">
              Destino: {data.direccion_destino}
            </div>
          )}
        </div>
        <span
          className={
            isDone
              ? "rounded-full px-2 py-1 text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
              : "rounded-full px-2 py-1 text-[11px] bg-amber-500/15 text-amber-200 border border-amber-500/40"
          }
        >
          {isDone ? "Finalizado" : "En ruta"}
        </span>
      </div>

      <div className="mt-3 flex gap-2 justify-end">
        <button
          onClick={openGoogle}
          className="rounded-lg px-3 py-1.5 text-xs bg-sky-500/20 text-sky-200 border border-sky-500/40"
        >
          Ver en mapa
        </button>
        <button
          onClick={handleFinalizar}
          disabled={isDone}
          className="rounded-lg px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 disabled:opacity-40"
        >
          {isDone ? "Finalizado" : "Finalizar entrega"}
        </button>
      </div>
    </div>
  );
}
