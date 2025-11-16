// app/api/admin/pedidos/sin-asignar/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const sql = `
    SELECT p.id, p.folio, p.created_at, p.estado, p.estado_entrega,
           c.nombre AS cliente
    FROM public.pedido p
    JOIN public.cliente c ON c.id = p.cliente_id
    WHERE p.asignado_a IS NULL AND p.estado <> 'cancelado'
    ORDER BY p.created_at DESC, p.folio DESC
    LIMIT 500
  `;
  const res = await query(sql);
  return NextResponse.json({ ok: true, pedidos: res.rows });
}
