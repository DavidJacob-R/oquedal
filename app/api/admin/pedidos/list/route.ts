// app/api/admin/pedidos/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // PENDIENTES — ordenados por cómo se registraron
    const sqlPend = `
      SELECT
        p.id,
        p.folio,
        p.created_at,
        c.nombre AS cliente,
        p.origen_direccion,
        p.destino_direccion,
        p.estado_entrega
      FROM public.pedido p
      JOIN public.cliente c ON c.id = p.cliente_id
      WHERE p.estado = 'pendiente'
      ORDER BY p.created_at ASC, p.folio ASC
      LIMIT 500
    `;
    const pendRes = await query(sqlPend);
    const pendientes = (pendRes.rows || []).map((r: any) => ({
      id: r.id,
      folio: Number(r.folio),
      created_at: r.created_at,
      cliente: r.cliente,
      origen: r.origen_direccion,
      destino: r.destino_direccion,
      estado_entrega: r.estado_entrega,
    }));

    // CONFIRMADOS — reflejan asignaciones (asignado_a + estado=confirmado)
    const sqlConf = `
      SELECT
        p.id,
        p.folio,
        p.created_at,
        c.nombre AS cliente,
        p.origen_direccion,
        p.destino_direccion,
        p.estado_entrega,
        u.nombre AS repartidor
      FROM public.pedido p
      JOIN public.cliente c ON c.id = p.cliente_id
      LEFT JOIN public.usuario u ON u.id = p.asignado_a
      WHERE p.estado = 'confirmado'
      ORDER BY p.created_at ASC, p.folio ASC
      LIMIT 500
    `;
    const confRes = await query(sqlConf);
    const confirmados = (confRes.rows || []).map((r: any) => ({
      id: r.id,
      folio: Number(r.folio),
      created_at: r.created_at,
      cliente: r.cliente,
      origen: r.origen_direccion,
      destino: r.destino_direccion,
      estado_entrega: r.estado_entrega,
      repartidor: r.repartidor ?? null,
    }));

    return NextResponse.json({ ok: true, pendientes, confirmados });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
