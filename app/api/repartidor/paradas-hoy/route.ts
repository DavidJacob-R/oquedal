// app/api/repartidor/paradas-hoy/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const repartidorUserId = cookies().get("repartidor_id")?.value || null;
  if (!repartidorUserId) {
    return NextResponse.json(
      { ok: false, error: "No autenticado (repartidor)" },
      { status: 401 }
    );
  }

  try {
    const sql = `
      SELECT
        pr.id                       AS parada_id,
        p.id                        AS pedido_id,
        p.folio,
        p.created_at,
        p.fecha,
        p.estado,
        p.estado_entrega,
        cli.nombre                  AS cliente,
        p.origen_direccion,
        p.destino_direccion,
        pr.estado                   AS estado_parada,
        pr.secuencia
      FROM public.parada_ruta pr
      JOIN public.ruta r
        ON r.id = pr.ruta_id
      JOIN public.conductor cond
        ON cond.id = r.conductor_id
      JOIN public.usuario u
        ON u.id = cond.usuario_id
      JOIN public.pedido p
        ON p.id = pr.pedido_id
      JOIN public.cliente cli
        ON cli.id = p.cliente_id
      WHERE u.id = $1
        AND r.fecha = CURRENT_DATE
      ORDER BY
        CASE
          WHEN pr.estado = 'pendiente' THEN 1
          WHEN pr.estado = 'en_ruta' THEN 2
          WHEN pr.estado = 'completado' THEN 3
          ELSE 4
        END,
        pr.secuencia ASC,
        p.created_at ASC
    `;

    const res = await query(sql, [repartidorUserId]);
    const rows = res.rows || [];

    const activos: any[] = [];
    const finalizados: any[] = [];

    for (const r of rows) {
      const estadoParada = String(r.estado_parada || "");
      const estadoPedido = String(r.estado || "");
      const estadoEntrega = String(r.estado_entrega || "");

      const base = {
        paradaId: String(r.parada_id),
        pedidoId: String(r.pedido_id),
        folio: Number(r.folio ?? 0),
        cliente: r.cliente ?? "",
        origen: r.origen_direccion ?? "",
        destino: r.destino_direccion ?? "",
        estado_parada: estadoParada,
        estado_pedido: estadoPedido,
        estado_entrega: estadoEntrega,
        created_at: r.created_at,
      };

      const isDone =
        estadoParada === "completado" ||
        estadoPedido === "completado" ||
        estadoEntrega === "completo";

      if (isDone) {
        finalizados.push(base);
      } else {
        activos.push(base);
      }
    }

    return NextResponse.json({
      ok: true,
      activos,
      finalizados,
    });
  } catch (e: any) {
    console.error("paradas-hoy error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
