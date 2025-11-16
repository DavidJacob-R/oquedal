import { cookies } from "next/headers";
import { query } from "@/lib/db";
import RutaDetalle from "@/components/repartidor/rutas/RutaDetalle";

export const dynamic = "force-dynamic";

export default async function RutaDetallePage({ params }: { params: { id: string } }) {
  const repUserId = cookies().get("repartidor_id")?.value || null;
  if (!repUserId) {
    return <div className="rounded-xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-300 text-sm">No autorizado.</div>;
  }

  const info = await query(
    `SELECT r.id, r.fecha, r.estado
     FROM public.ruta r
     JOIN public.conductor c ON c.id = r.conductor_id
     WHERE r.id = $1 AND c.usuario_id = $2
     LIMIT 1`,
    [params.id, repUserId]
  );

  if ((info.rows?.length ?? 0) === 0) {
    return <div className="rounded-xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-300 text-sm">Ruta no encontrada.</div>;
  }
  const r = info.rows[0] as { id: string; fecha: string; estado: string };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-neutral-950/40 p-4 flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm text-neutral-300">Ruta <span className="font-semibold text-neutral-100">{String(r.id).slice(0,8)}</span></div>
          <div className="text-[12px] text-neutral-400">Fecha: {String(r.fecha)}</div>
        </div>
        <div>
          <span className="inline-block rounded-full bg-white/5 px-2 py-0.5 text-[11px] ring-1 ring-white/10 text-neutral-300">{r.estado}</span>
        </div>
      </div>

      <RutaDetalle rutaId={params.id} />
    </div>
  );
}
