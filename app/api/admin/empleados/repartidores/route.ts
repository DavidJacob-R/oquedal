// app/api/admin/empleados/repartidores/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const adminId = cookies().get("admin_id")?.value || null;
  if (!adminId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Usuarios con rol 'repartidor'
  const sql = `
    SELECT u.id AS usuario_id, u.nombre
    FROM public.usuario u
    JOIN public.rol r ON r.id = u.rol_id
    WHERE u.activo = true AND LOWER(r.nombre) = 'repartidor'
    ORDER BY u.nombre ASC
  `;
  const r = await query(sql, []);

  const repartidores = (r.rows || []).map((row: any) => ({
    id: String(row.usuario_id),         // normalizamos a usuario_id
    user_id: String(row.usuario_id),    // por compatibilidad
    nombre: row.nombre,
    ayudantes: 0,                       // si no tienes tabla de ayudantes, dejamos 0
    totalEstimadoHoy: 0,                // lo recalcularemos desde /asignados
  }));

  return NextResponse.json({ ok: true, repartidores });
}
