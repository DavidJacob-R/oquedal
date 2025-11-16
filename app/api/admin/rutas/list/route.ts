// app/api/admin/rutas/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const sql = `
      WITH stats AS (
        SELECT
          pr.ruta_id,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE pr.salida_real IS NOT NULL OR pr.estado = 'finalizada')::int AS done
        FROM public.parada_ruta pr
        GROUP BY pr.ruta_id
      )
      SELECT
        r.id,
        r.fecha,
        r.estado,
        v.placas,
        u.nombre AS repartidor,
        COALESCE(s.total,0) AS total,
        COALESCE(s.done,0)  AS done
      FROM public.ruta r
      JOIN public.vehiculo v   ON v.id = r.vehiculo_id
      JOIN public.conductor c  ON c.id = r.conductor_id
      JOIN public.usuario   u  ON u.id = c.usuario_id
      LEFT JOIN stats s        ON s.ruta_id = r.id
      WHERE r.fecha = CURRENT_DATE
      ORDER BY
        CASE r.estado
          WHEN 'en_ruta' THEN 0
          WHEN 'planificada' THEN 1
          WHEN 'completada' THEN 2
          ELSE 3
        END,
        r.fecha ASC;
    `;
    const res = await query(sql);
    const rutas = (res.rows || []).map((r: any) => ({
      id: r.id,
      fecha: r.fecha,
      estado: r.estado,
      placas: r.placas,
      repartidor: r.repartidor,
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
