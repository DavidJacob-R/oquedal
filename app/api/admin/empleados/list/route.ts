// app/api/admin/empleados/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    // Obtener IDs de roles
    const rolesRes = await query(`SELECT id, LOWER(nombre) AS nombre FROM public.rol WHERE LOWER(nombre) IN ('repartidor','ayudante')`);
    const roleMap: Record<string, string> = {};
    for (const r of rolesRes.rows) roleMap[r.nombre] = r.id;

    const rolRepartidor = roleMap["repartidor"];
    const rolAyudante  = roleMap["ayudante"];

    // Repartidores con licencia (tabla conductor) y conteo de ayudantes
    const repSQL = `
      SELECT
        u.id, u.nombre, u.email, u.telefono, u.activo,
        c.licencia, c.activo AS conductor_activo,
        COALESCE(ayu.cnt, 0) AS ayudantes_asignados
      FROM public.usuario u
      LEFT JOIN public.conductor c ON c.usuario_id = u.id
      LEFT JOIN (
        SELECT repartidor_id, COUNT(*)::int AS cnt
        FROM public.repartidor_ayudante
        GROUP BY repartidor_id
      ) ayu ON ayu.repartidor_id = u.id
      WHERE u.rol_id = $1
      ORDER BY u.activo DESC, LOWER(u.nombre) ASC
    `;
    const repRes = await query(repSQL, [rolRepartidor]);

    // Ayudantes y a qué repartidor están asignados (si aplica)
    const ayudSQL = `
      SELECT
        u.id, u.nombre, u.email, u.telefono, u.activo,
        ra.repartidor_id,
        ur.nombre AS repartidor_nombre
      FROM public.usuario u
      LEFT JOIN public.repartidor_ayudante ra ON ra.ayudante_id = u.id
      LEFT JOIN public.usuario ur ON ur.id = ra.repartidor_id
      WHERE u.rol_id = $1
      ORDER BY u.activo DESC, LOWER(u.nombre) ASC
    `;
    const ayudRes = await query(ayudSQL, [rolAyudante]);

    return NextResponse.json({
      ok: true,
      rolRepartidor,
      rolAyudante,
      repartidores: repRes.rows,
      ayudantes: ayudRes.rows
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
