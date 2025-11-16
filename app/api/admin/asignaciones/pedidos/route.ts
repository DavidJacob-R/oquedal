// app/api/admin/asignaciones/pedidos/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  // Validación extra: solo admin
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const sql = `
    SELECT
      p.id, p.folio, p.created_at, p.estado, p.estado_entrega,
      c.nombre AS cliente,
      p.asignado_a,
      u.nombre AS asignado_nombre,
      we.horas AS estimado_hoy
    FROM public.pedido p
    JOIN public.cliente c ON c.id = p.cliente_id
    LEFT JOIN public.usuario u ON u.id = p.asignado_a
    LEFT JOIN public.workload_estimacion we
      ON we.pedido_id = p.id AND we.fecha = CURRENT_DATE
    ORDER BY p.created_at ASC, p.folio ASC
    LIMIT 1000
  `;
  const res = await query(sql);
  return NextResponse.json({ ok: true, pedidos: res.rows });
}
