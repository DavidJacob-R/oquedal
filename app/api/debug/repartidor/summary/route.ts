// app/api/debug/repartidor/summary/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repUserId = cookies().get("repartidor_id")?.value || null;
    const usuarioId = repUserId || null;

    const who = await query(
      `SELECT u.id, u.nombre, LOWER(r.nombre) AS rol
       FROM public.usuario u
       JOIN public.rol r ON r.id = u.rol_id
       WHERE u.id = $1
       LIMIT 1`,
      [usuarioId]
    );

    const conductor = await query(
      `SELECT id AS conductor_id, activo
       FROM public.conductor
       WHERE usuario_id = $1
       LIMIT 1`,
      [usuarioId]
    );

    const rutas = await query(
      `SELECT r.id, r.fecha, r.estado,
              COUNT(pr.id)::int AS paradas_total
       FROM public.ruta r
       JOIN public.conductor c ON c.id = r.conductor_id
       LEFT JOIN public.parada_ruta pr ON pr.ruta_id = r.id
       WHERE c.usuario_id = $1
       GROUP BY r.id
       ORDER BY r.fecha DESC, r.id
       LIMIT 20`,
      [usuarioId]
    );

    return NextResponse.json({
      ok: true,
      cookies: { repartidor_id: repUserId || null },
      who: who.rows?.[0] ?? null,
      conductor: conductor.rows?.[0] ?? null,
      rutas: rutas.rows ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
