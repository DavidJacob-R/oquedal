// app/api/admin/pedidos/listado/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * Filtros opcionales:
 *  ?filter=cancelado | en_proceso | todos (default)
 * Orden: por created_at DESC (como se registraron)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "todos";

  // estados en tu esquema: borrador, pendiente, confirmado, cancelado, completado
  let where = "1=1";
  if (filter === "cancelado") {
    where = "p.estado = 'cancelado'";
  } else if (filter === "en_proceso") {
    // interpretamos "en proceso" como no cancelado ni completado (pendiente/confirmado)
    where = "p.estado IN ('pendiente','confirmado')";
  }

  const sql = `
    SELECT
      p.id,
      p.folio,
      p.cliente_id,
      c.nombre AS cliente_nombre,
      p.estado,
      p.estado_entrega,
      p.created_at,
      p.asignado_a,
      u.nombre AS asignado_nombre
    FROM public.pedido p
    JOIN public.cliente c ON c.id = p.cliente_id
    LEFT JOIN public.usuario u ON u.id = p.asignado_a
    WHERE ${where}
    ORDER BY p.created_at DESC, p.folio DESC
    LIMIT 500
  `;

  const res = await query(sql);
  return NextResponse.json({ ok: true, pedidos: res.rows });
}
