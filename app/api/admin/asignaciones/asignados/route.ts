// app/api/admin/asignaciones/asignados/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const sql = `
    SELECT
      p.id,
      p.folio,
      p.created_at,
      c.nombre AS cliente,
      u.id     AS repartidor_id,
      u.nombre AS repartidor_nombre,
      -- Forzamos número: si horas es NUMERIC, la casteamos a float8
      COALESCE(we.horas::float8, 0.0) AS horas
    FROM public.pedido p
    JOIN public.cliente c ON c.id = p.cliente_id
    JOIN public.usuario  u ON u.id = p.asignado_a
    LEFT JOIN public.workload_estimacion we
      ON we.pedido_id = p.id AND we.fecha = CURRENT_DATE
    WHERE p.estado = 'confirmado'
      AND p.asignado_a IS NOT NULL
    ORDER BY p.created_at ASC, p.folio ASC
    LIMIT 1000
  `;

  const res = await query(sql);
  // Aún así, por seguridad, normalizamos a number
  const asignados = (res.rows || []).map((r: any) => ({
    ...r,
    horas: Number(r.horas ?? 0),
  }));

  return NextResponse.json({ ok: true, asignados });
}
