// app/api/admin/asignaciones/pendientes/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";
import { estimateHorasForPedido } from "@/lib/estimate";

export async function GET() {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const sql = `
    SELECT
      p.id, p.folio, p.created_at, p.estado, p.estado_entrega,
      p.tipo, p.origen_ciudad, p.destino_ciudad, p.volumen_m3, p.peso_kg,
      c.nombre AS cliente
    FROM public.pedido p
    JOIN public.cliente c ON c.id = p.cliente_id
    WHERE p.estado = 'pendiente' AND p.asignado_a IS NULL
    ORDER BY p.created_at ASC, p.folio ASC
    LIMIT 1000
  `;
  const res = await query(sql);
  const pedidos = res.rows.map((r: any) => ({
    id: r.id,
    folio: r.folio,
    created_at: r.created_at,
    estado: r.estado,
    estado_entrega: r.estado_entrega,
    cliente: r.cliente,
    estimado_sugerido: estimateHorasForPedido({
      tipo: r.tipo,
      origen_ciudad: r.origen_ciudad,
      destino_ciudad: r.destino_ciudad,
      volumen_m3: r.volumen_m3,
      peso_kg: r.peso_kg,
    }),
  }));

  return NextResponse.json({ ok: true, pedidos });
}
