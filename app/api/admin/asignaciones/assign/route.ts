// app/api/admin/asignaciones/assign/route.ts
import { NextResponse } from "next/server";
import { tx, query } from "@/lib/db";
import { cookies } from "next/headers";

type Body = { pedidoId: string; repartidorUserId: string };

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const adminId = cookies().get("admin_id")?.value || null;
  if (!adminId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { pedidoId, repartidorUserId } = (await req.json()) as Body;
  if (!pedidoId || !repartidorUserId) {
    return NextResponse.json({ ok: false, error: "Faltan pedidoId o repartidorUserId" }, { status: 400 });
  }

  try {
    const out = await tx(async (client) => {
      const p0 = await client.query(`SELECT id FROM public.pedido WHERE id = $1 LIMIT 1`, [pedidoId]);
      if ((p0.rows?.length ?? 0) === 0) throw new Error("Pedido no encontrado");

      // Asegurar conductor
      let conductorId: string;
      const c0 = await client.query(`SELECT id FROM public.conductor WHERE usuario_id = $1 LIMIT 1`, [repartidorUserId]);
      if (c0.rows?.length) {
        conductorId = String(c0.rows[0].id);
      } else {
        const c1 = await client.query(
          `INSERT INTO public.conductor (usuario_id, licencia, activo)
           VALUES ($1, NULL, true)
           RETURNING id`,
          [repartidorUserId]
        );
        conductorId = String(c1.rows[0].id);
      }

      // Vehículo
      let vehiculoId: string;
      const v0 = await client.query(`SELECT id FROM public.vehiculo WHERE activo = true ORDER BY capacidad_kg DESC NULLS LAST LIMIT 1`);
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

      // Ruta de hoy
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

      // Evitar duplicar parada si ya existe
      const exists = await client.query(
        `SELECT 1 FROM public.parada_ruta WHERE ruta_id = $1 AND pedido_id = $2 LIMIT 1`,
        [rutaId, pedidoId]
      );
      let paradaId: string;
      if (exists.rows?.length) {
        const pr0 = await client.query(
          `SELECT id FROM public.parada_ruta WHERE ruta_id = $1 AND pedido_id = $2 LIMIT 1`,
          [rutaId, pedidoId]
        );
        paradaId = String(pr0.rows[0].id);
      } else {
        const s0 = await client.query(
          `SELECT COALESCE(MAX(secuencia), 0) + 1 AS next_seq
           FROM public.parada_ruta
           WHERE ruta_id = $1`,
          [rutaId]
        );
        const nextSeq = Number(s0.rows?.[0]?.next_seq ?? 1);

        const pr = await client.query(
          `INSERT INTO public.parada_ruta (ruta_id, pedido_id, secuencia, estado)
           VALUES ($1, $2, $3, 'pendiente')
           RETURNING id`,
          [rutaId, pedidoId, nextSeq]
        );
        paradaId = String(pr.rows[0].id);
      }

      // Marcar pedido
      await client.query(
        `UPDATE public.pedido
           SET asignado_a = $1,
               estado = 'confirmado'
         WHERE id = $2`,
        [repartidorUserId, pedidoId]
      );

      return { rutaId, paradaId };
    });

    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
