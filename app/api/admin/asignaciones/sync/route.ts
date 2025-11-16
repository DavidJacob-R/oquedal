// app/api/admin/asignaciones/sync/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { tx, query } from "@/lib/db";

type Body = {
  pedidoId?: string; // opcional: si lo envías, sincroniza solo ese pedido
};

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const adminId = cookies().get("admin_id")?.value || null;
  if (!adminId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { pedidoId } = (await req.json().catch(() => ({}))) as Body;

  try {
    // 1) Encontrar pedidos asignados SIN parada_ruta
    const baseSQL = `
      SELECT p.id AS pedido_id, p.asignado_a AS repartidor_user_id, p.estado
      FROM public.pedido p
      WHERE p.asignado_a IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.parada_ruta pr WHERE pr.pedido_id = p.id
        )
      ${pedidoId ? "AND p.id = $1" : ""}
      ORDER BY p.created_at ASC
    `;
    const pend = await query(baseSQL, pedidoId ? [pedidoId] : []);
    if ((pend.rows?.length ?? 0) === 0) {
      return NextResponse.json({ ok: true, processed: 0, details: [] });
    }

    const details: any[] = [];

    // 2) Procesar cada pedido
    for (const row of pend.rows) {
      const pid = String(row.pedido_id);
      const repUserId = String(row.repartidor_user_id);

      const info = await tx(async (client) => {
        // 2.1) Asegurar CONDUCTOR
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

        // 2.2) Asegurar VEHICULO (si no hay ninguno activo, crea uno)
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

        // 2.3) Ruta de HOY para este conductor
        let rutaId: string;
        const r0 = await client.query(
          `SELECT id FROM public.ruta
           WHERE fecha = CURRENT_DATE AND conductor_id = $1 AND estado IN ('planificada','en_ruta')
           ORDER BY id
           LIMIT 1`,
          [conductorId]
        );
        if (r0.rows?.length) {
          rutaId = String(r0.rows[0].id);
        } else {
          const r1 = await client.query(
            `INSERT INTO public.ruta (fecha, vehiculo_id, conductor_id, estado)
             VALUES (CURRENT_DATE, $1, $2, 'planificada')
             RETURNING id`,
            [vehiculoId, conductorId]
          );
          rutaId = String(r1.rows[0].id);
        }

        // 2.4) Siguiente secuencia
        const s0 = await client.query(
          `SELECT COALESCE(MAX(secuencia), 0) + 1 AS next_seq
           FROM public.parada_ruta
           WHERE ruta_id = $1`,
          [rutaId]
        );
        const nextSeq = Number(s0.rows?.[0]?.next_seq ?? 1);

        // 2.5) Insertar parada
        const pr = await client.query(
          `INSERT INTO public.parada_ruta (ruta_id, pedido_id, secuencia, estado)
           VALUES ($1, $2, $3, 'pendiente')
           RETURNING id`,
          [rutaId, pid, nextSeq]
        );
        const paradaId = String(pr.rows[0].id);

        // 2.6) Confirmar pedido si no lo está
        await client.query(
          `UPDATE public.pedido
             SET estado = 'confirmado'
           WHERE id = $1 AND estado <> 'confirmado'`,
          [pid]
        );

        return { rutaId, paradaId, nextSeq, conductorId };
      });

      details.push({ pedidoId: pid, ...info });
    }

    return NextResponse.json({ ok: true, processed: details.length, details });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
