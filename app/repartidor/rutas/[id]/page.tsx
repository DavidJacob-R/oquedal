// app/repartidor/rutas/[id]/page.tsx
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import RutaDetalle from "@/components/repartidor/rutas/RutaDetalle";

export const dynamic = "force-dynamic";

type EstadoRuta = "planificada" | "en_ruta" | "completada" | string;

function estadoRutaLabel(e: EstadoRuta): string {
  if (e === "planificada") return "Planificada";
  if (e === "en_ruta") return "En ruta";
  if (e === "completada") return "Completada";
  return String(e);
}

function estadoRutaClase(e: EstadoRuta): string {
  if (e === "planificada") {
    return "bg-sky-500/15 text-sky-200 ring-sky-500/40";
  }
  if (e === "en_ruta") {
    return "bg-amber-500/15 text-amber-200 ring-amber-500/40";
  }
  if (e === "completada") {
    return "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40";
  }
  return "bg-neutral-700/40 text-neutral-200 ring-neutral-500/40";
}

export default async function RutaDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const repUserId = cookies().get("repartidor_id")?.value || null;

  if (!repUserId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6 text-sm text-neutral-300">
        No autorizado.
      </div>
    );
  }

  const info = await query(
    `SELECT r.id, r.fecha, r.estado
       FROM public.ruta r
       JOIN public.conductor c ON c.id = r.conductor_id
      WHERE r.id = $1 AND c.usuario_id = $2
      LIMIT 1`,
    [params.id, repUserId]
  );

  if (!info.rows || info.rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6 text-sm text-neutral-300">
        Ruta no encontrada.
      </div>
    );
  }

  const r = info.rows[0] as {
    id: string;
    fecha: string;
    estado: EstadoRuta;
  };

  const fechaFormateada = r.fecha
    ? new Date(r.fecha).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Sin fecha";

  const estadoLabel = estadoRutaLabel(r.estado);
  const estadoClase = estadoRutaClase(r.estado);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-neutral-950/60 p-4 ring-1 ring-black/30 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm text-neutral-300">
            Ruta{" "}
            <span className="font-semibold text-neutral-50">
              #{String(r.id).slice(0, 8)}
            </span>
          </div>
          <div className="text-[12px] text-neutral-400">
            Fecha: <span className="text-neutral-200">{fechaFormateada}</span>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] ring-1 ${estadoClase}`}
        >
          {estadoLabel}
        </span>
      </div>

      <RutaDetalle rutaId={params.id} />
    </div>
  );
}
