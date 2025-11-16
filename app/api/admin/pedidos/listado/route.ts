// app/api/admin/pedidos/listado/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const adminId = cookies().get("admin_id")?.value || null;
  if (!adminId) {
    return NextResponse.json(
      { ok: false, error: "No autenticado (admin)" },
      { status: 401 }
    );
  }

  try {
    const sql = `
      SELECT
        p.id,
        p.folio,
        p.fecha,
        p.estado,
        p.estado_entrega,
        p.created_at,
        p.origen_direccion,
        p.destino_direccion,
        cli.nombre AS cliente,
        p.asignado_a,
        u.nombre AS repartidor_nombre
      FROM public.pedido p
      LEFT JOIN public.cliente cli
        ON cli.id = p.cliente_id
      LEFT JOIN public.usuario u
        ON u.id = p.asignado_a
      ORDER BY p.created_at DESC
    `;

    const res = await query(sql, []);
    const rows = res.rows || [];

    const pendientes: any[] = [];
    const asignados: any[] = [];
    const cancelados: any[] = [];
    const finalizados: any[] = [];

    for (const r of rows) {
      const estado = String(r.estado || "");
      const estado_entrega = String(r.estado_entrega || "");
      const asignado_a = r.asignado_a ? String(r.asignado_a) : null;

      const base = {
        id: String(r.id),
        folio: Number(r.folio ?? 0),
        fecha: r.fecha,
        created_at: r.created_at,
        estado,
        estado_entrega,
        cliente: r.cliente ?? "",
        origen: r.origen_direccion ?? "",
        destino: r.destino_direccion ?? "",
        asignado_a,
        repartidor: r.repartidor_nombre ?? "",
      };

      if (estado === "cancelado") {
        cancelados.push(base);
      } else if (estado === "completado" || estado_entrega === "completo") {
        finalizados.push(base);
      } else if (asignado_a) {
        // Pedido ya está asignado a un repartidor, pero no finalizado ni cancelado
        asignados.push(base);
      } else {
        // Ni cancelado, ni finalizado, ni asignado
        pendientes.push(base);
      }
    }

    return NextResponse.json({
      ok: true,
      pendientes,
      asignados,
      cancelados,
      finalizados,
    });
  } catch (e: any) {
    console.error("admin pedidos listado error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
