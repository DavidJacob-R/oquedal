// app/api/admin/empleados/repartidores/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const sql = `
    WITH rep AS (
      SELECT u.id, u.nombre
      FROM public.usuario u
      LEFT JOIN public.rol r ON r.id = u.rol_id
      WHERE u.activo = true
        AND (LOWER(r.nombre) = 'repartidor' OR u.id IN (SELECT usuario_id FROM public.conductor))
    ),
    carga AS (
      SELECT repartidor_id, COALESCE(SUM(horas)::float8, 0.0) AS total_hoy
      FROM public.workload_estimacion
      WHERE fecha = CURRENT_DATE
      GROUP BY repartidor_id
    ),
    ayud AS (
      SELECT repartidor_id, COUNT(*)::int AS n_ayudantes
      FROM public.ayudante_relacion
      GROUP BY repartidor_id
    )
    SELECT
      rep.id,
      rep.nombre,
      COALESCE(carga.total_hoy, 0.0) AS total_hoy,
      COALESCE(ayud.n_ayudantes, 0) AS ayudantes
    FROM rep
    LEFT JOIN carga ON carga.repartidor_id = rep.id
    LEFT JOIN ayud  ON ayud.repartidor_id  = rep.id
    ORDER BY rep.nombre ASC
  `;

  const res = await query(sql);
  const repartidores = (res.rows || []).map((r: any) => ({
    id: r.id,
    nombre: r.nombre,
    totalEstimadoHoy: Number(r.total_hoy ?? 0),
    ayudantes: Number(r.ayudantes ?? 0),
  }));

  return NextResponse.json({ ok: true, repartidores });
}
