// app/api/repartidor/rutas/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const repUserId = cookies().get("repartidor_id")?.value; // usuario.id
  if (!repUserId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    // obtener conductor.id por usuario_id
    const cRes = await query(`SELECT id FROM public.conductor WHERE usuario_id = $1`, [repUserId]);
    if (cRes.rowCount === 0) return NextResponse.json({ ok: true, rutas: [] });
    const conductorId = cRes.rows[0].id;

    const sql = `
      WITH stats AS (
        SELECT
          pr.ruta_id,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE pr.salida_real IS NOT NULL OR pr.estado = 'finalizada')::int AS done
        FROM public.parada_ruta pr
        GROUP BY pr.ruta_id
      )
      SELECT r.id, r.fecha, r.estado, v.placas,
             COALESCE(s.total,0) AS total,
             COALESCE(s.done,0)  AS done
      FROM public.ruta r
      JOIN public.vehiculo v ON v.id = r.vehiculo_id
      LEFT JOIN stats s ON s.ruta_id = r.id
      WHERE r.fecha = CURRENT_DATE
        AND r.conductor_id = $1
      ORDER BY r.estado ASC, r.fecha ASC;
    `;
    const res = await query(sql, [conductorId]);
    const rutas = (res.rows || []).map((r: any) => ({
      id: r.id,
      fecha: r.fecha,
      estado: r.estado,
      placas: r.placas,
      total: Number(r.total || 0),
      done: Number(r.done || 0),
      progreso: (() => {
        const t = Number(r.total || 0);
        const d = Number(r.done || 0);
        return t > 0 ? Math.round((d / t) * 100) : 0;
      })(),
    }));

    return NextResponse.json({ ok: true, rutas });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
