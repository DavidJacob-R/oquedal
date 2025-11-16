import Link from "next/link";
import { cookies } from "next/headers";
import { query, tx } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Normaliza cualquier valor a 'YYYY-MM-DD' (UTC, sin hora) */
function toYmd(v: unknown): string {
  if (v instanceof Date) {
    const d = new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v ?? "").trim();
  // Si ya viene como YYYY-MM-DD
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // Último recurso: parsear y devolver YYYY-MM-DD
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    return u.toISOString().slice(0, 10);
  }
  // Evita romper la query; regresa hoy
  const today = new Date();
  const u = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  return u.toISOString().slice(0, 10);
}

/**
 * Asegura que todo pedido asignado al repartidor tenga su ruta (por fecha del pedido)
 * y su parada_ruta. No duplica, solo rellena lo que falte.
 */
async function ensureRepRoutes(repUserId: string) {
  await tx(async (client) => {
    // 1) Conductor
    let conductorId: string;
    const c0 = await client.query(
      `SELECT id FROM public.conductor WHERE usuario_id = $1 LIMIT 1`,
      [repUserId]
    );
    if (c0.rows?.length) {
      conductorId = String(c0.rows[0].id);
    } else {
      const c1 = await client.query(
        `INSERT INTO public.conductor (usuario_id, licencia, activo)
         VALUES ($1, NULL, true)
         RETURNING id`,
        [repUserId]
      );
      conductorId = String(c1.rows[0].id);
    }

    // 2) Vehículo
    let vehiculoId: string;
    const v0 = await client.query(
      `SELECT id FROM public.vehiculo WHERE activo = true ORDER BY capacidad_kg DESC NULLS LAST LIMIT 1`
    );
    if (v0.rows?.length) {
      vehiculoId = String(v0.rows[0].id);
    } else {
      const placas = "TMP-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      const v1 = await client.query(
        `INSERT INTO public.vehiculo (placas, capacidad_kg, capacidad_vol_m3, activo)
         VALUES ($1, 1000, 10, true)
         RETURNING id`,
        [placas]
      );
      vehiculoId = String(v1.rows[0].id);
    }

    // 3) Pedidos asignados sin parada
    const pend = await client.query(
      `SELECT p.id, p.fecha
       FROM public.pedido p
       WHERE p.asignado_a = $1
         AND NOT EXISTS (SELECT 1 FROM public.parada_ruta pr WHERE pr.pedido_id = p.id)
       ORDER BY p.created_at ASC`,
      [repUserId]
    );

    // 4) Crear/usar ruta por fecha del pedido y crear parada
    for (const row of pend.rows || []) {
      const pedidoId: string = String(row.id);
      const fechaYmd: string = toYmd(row.fecha);

      // Ruta del mismo día
      let rutaId: string;
      const r0 = await client.query(
        `SELECT id FROM public.ruta
         WHERE conductor_id = $1 AND fecha = $2::date
         ORDER BY id LIMIT 1`,
        [conductorId, fechaYmd]
      );
      if (r0.rows?.length) {
        rutaId = String(r0.rows[0].id);
      } else {
        const r1 = await client.query(
          `INSERT INTO public.ruta (fecha, vehiculo_id, conductor_id, estado)
           VALUES ($1::date, $2, $3, 'planificada')
           RETURNING id`,
          [fechaYmd, vehiculoId, conductorId]
        );
        rutaId = String(r1.rows[0].id);
      }

      // Evitar duplicado
      const ex = await client.query(
        `SELECT 1 FROM public.parada_ruta WHERE ruta_id = $1 AND pedido_id = $2 LIMIT 1`,
        [rutaId, pedidoId]
      );
      if (!(ex.rows?.length)) {
        const s0 = await client.query(
          `SELECT COALESCE(MAX(secuencia), 0) + 1 AS next_seq
           FROM public.parada_ruta
           WHERE ruta_id = $1`,
          [rutaId]
        );
        const nextSeq = Number(s0.rows?.[0]?.next_seq ?? 1);

        await client.query(
          `INSERT INTO public.parada_ruta (ruta_id, pedido_id, secuencia, estado)
           VALUES ($1, $2, $3, 'pendiente')`,
          [rutaId, pedidoId, nextSeq]
        );
      }

      await client.query(
        `UPDATE public.pedido SET estado = 'confirmado'
         WHERE id = $1 AND estado <> 'confirmado'`,
        [pedidoId]
      );
    }
  });
}

export default async function RepartidorRutasPage() {
  const repUserId = cookies().get("repartidor_id")?.value || null;
  if (!repUserId) {
    return (
      <div className="mx-auto max-w-5xl p-6 rounded-xl border border-white/10 bg-neutral-950/40 text-neutral-300 text-sm">
        No autorizado.
      </div>
    );
  }

  // Auto-sync ANTES de listar
  await ensureRepRoutes(repUserId);

  // Listar rutas
  const res = await query(
    `SELECT r.id, r.fecha, r.estado,
            COUNT(pr.id)::int AS total,
            COUNT(pr.id) FILTER (WHERE pr.salida_real IS NOT NULL)::int AS done
     FROM public.ruta r
     JOIN public.conductor c ON c.id = r.conductor_id
     LEFT JOIN public.parada_ruta pr ON pr.ruta_id = r.id
     WHERE c.usuario_id = $1
     GROUP BY r.id
     ORDER BY r.fecha DESC, r.id`,
    [repUserId]
  );

  const rutas = (res.rows || []).map((r: any) => ({
    id: String(r.id),
    fecha: String(r.fecha),
    estado: String(r.estado),
    total: Number(r.total),
    done: Number(r.done),
  }));

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold text-neutral-100">Mis rutas</h1>

      {rutas.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-400 text-sm">
          No tienes rutas asignadas.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rutas.map((r) => (
            <Link
              key={r.id}
              href={`/repartidor/rutas/${r.id}`}
              className="rounded-xl border border-white/10 bg-neutral-950/40 p-4 hover:bg-white/5 active:scale-[0.99] transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="text-sm text-neutral-300">
                    Ruta <span className="font-semibold text-neutral-100">{r.id.slice(0, 8)}</span>
                  </div>
                  <div className="text-[12px] text-neutral-400">Fecha: {r.fecha}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-neutral-400">{r.done}/{r.total} completadas</div>
                  <div className="mt-1 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[11px] ring-1 ring-white/10 text-neutral-300">
                    {r.estado}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
