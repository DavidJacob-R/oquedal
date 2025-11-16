// app/api/admin/empleados/lista/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const sql = `
    WITH roles AS (
      SELECT id, nombre FROM public.rol
    ),
    repartidores AS (
      SELECT u.id, u.nombre, u.email, u.telefono,
             (SELECT licencia FROM public.conductor c WHERE c.usuario_id=u.id) AS licencia,
             'repartidor' as rol
      FROM public.usuario u
      LEFT JOIN public.rol r ON r.id=u.rol_id
      WHERE u.activo=true AND (LOWER(r.nombre)='repartidor' OR u.id IN (SELECT usuario_id FROM public.conductor))
    ),
    ayudantes AS (
      SELECT u.id, u.nombre, u.email, u.telefono,
             NULL::text AS licencia,
             'ayudante' as rol
      FROM public.usuario u
      LEFT JOIN public.rol r ON r.id=u.rol_id
      WHERE u.activo=true AND LOWER(r.nombre)='ayudante'
    ),
    todos AS (
      SELECT * FROM repartidores
      UNION ALL
      SELECT * FROM ayudantes
    ),
    ayud_map AS (
      SELECT repartidor_id, COUNT(*) AS n
      FROM public.ayudante_relacion
      GROUP BY repartidor_id
    )
    SELECT t.*, COALESCE(a.n,0) AS ayudantes
    FROM todos t
    LEFT JOIN ayud_map a ON a.repartidor_id = t.id
    ORDER BY rol, nombre;
  `;
  const res = await query(sql);
  return NextResponse.json({ ok: true, empleados: res.rows });
}
