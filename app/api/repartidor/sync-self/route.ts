import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { tx } from "@/lib/db";

export const dynamic = "force-dynamic";

function toYmd(v: unknown): string {
  if (v instanceof Date) {
    const d = new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    return u.toISOString().slice(0, 10);
  }
  const today = new Date();
  const u = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  return u.toISOString().slice(0, 10);
}

export async function POST() {
  const repUserId = cookies().get("repartidor_id")?.value || null;
  if (!repUserId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    await tx(async (client) => {
      // conductor
      let conductorId: string;
      const c0 = await client.query(`SELECT id FROM public.conductor WHERE usuario_id=$1 LIMIT 1`, [repUserId]);
      if (c0.rows?.length) {
        conductorId = String(c0.rows[0].id);
      } else {
        const c1 = await client.query(
          `INSERT INTO public.conductor (usuario_id, licencia, activo)
           VALUES ($1, NULL, true) RETURNING id`,
          [repUserId]
        );
        conductorId = String(c1.rows[0].id);
      }

      // vehiculo
      let vehiculoId: string;
      const v0 = await client.query(`SELECT id FROM public.vehiculo WHERE activo = true ORDER BY capacidad_kg DESC NULLS LAST LIMIT 1`);
      if (v0.rows?.length) {
        vehiculoId = String(v0.rows[0].id);
      } else {
        const placas = "TMP-" + Math.random().toString(36).slice(2, 8).toUpperCase();
        const v1 = await client.query(
          `INSERT INTO public.vehiculo (placas, capacidad_kg, capacidad_vol_m3, activo)
           VALUES ($1, 1000, 10, true) RETURNING id`,
          [placas]
        );
        vehiculoId = String(v1.rows[0].id);
      }

      // pedidos sin parada
      const pend = await client.query(
        `SELECT p.id, p.fecha
         FROM public.pedido p
         WHERE p.asignado_a=$1
           AND NOT EXISTS (SELECT 1 FROM public.parada_ruta pr WHERE pr.pedido_id = p.id)
         ORDER BY p.created_at ASC`,
        [repUserId]
      );

      for (const row of pend.rows || []) {
        const pedidoId: string = String(row.id);
        const fechaYmd: string = toYmd(row.fecha);

        // ruta por fecha
        let rutaId: string;
        const r0 = await client.query(
          `SELECT id FROM public.ruta
           WHERE conductor_id=$1 AND fecha=$2::date LIMIT 1`,
          [conductorId, fechaYmd]
        );
        if (r0.rows?.length) {
          rutaId = String(r0.rows[0].id);
        } else {
          const r1 = await client.query(
            `INSERT INTO public.ruta (fecha, vehiculo_id, conductor_id, estado)
             VALUES ($1::date, $2, $3, 'planificada') RETURNING id`,
            [fechaYmd, vehiculoId, conductorId]
          );
          rutaId = String(r1.rows[0].id);
        }

        const ex = await client.query(
          `SELECT 1 FROM public.parada_ruta WHERE ruta_id=$1 AND pedido_id=$2 LIMIT 1`,
          [rutaId, pedidoId]
        );
        if (!(ex.rows?.length)) {
          const s0 = await client.query(
            `SELECT COALESCE(MAX(secuencia),0)+1 AS next_seq
             FROM public.parada_ruta WHERE ruta_id=$1`,
            [rutaId]
          );
          const nextSeq = Number(s0.rows?.[0]?.next_seq ?? 1);
          await client.query(
            `INSERT INTO public.parada_ruta (ruta_id, pedido_id, secuencia, estado)
             VALUES ($1,$2,$3,'pendiente')`,
            [rutaId, pedidoId, nextSeq]
          );
        }

        await client.query(
          `UPDATE public.pedido SET estado='confirmado' WHERE id=$1 AND estado<>'confirmado'`,
          [pedidoId]
        );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
