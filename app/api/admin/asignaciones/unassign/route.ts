// app/api/admin/asignaciones/unassign/route.ts
import { NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { pedidoId } = await req.json();
  if (!pedidoId) {
    return NextResponse.json({ ok: false, error: "pedidoId requerido" }, { status: 400 });
  }

  try {
    const result = await tx(async (client: any) => {
      // 1) Bloquea SOLO la fila de pedido (sin JOIN)
      const pRes = await client.query(
        `SELECT asignado_a FROM public.pedido WHERE id = $1 FOR UPDATE`,
        [pedidoId]
      );
      if (pRes.rowCount === 0) throw new Error("Pedido no existe");

      const repartidorId: string | null = pRes.rows[0].asignado_a ?? null;

      // 2) Lee horas estimadas de hoy (sin FOR UPDATE; no hace falta bloquear esta tabla)
      const weRes = await client.query(
        `SELECT horas FROM public.workload_estimacion
         WHERE pedido_id = $1 AND fecha = CURRENT_DATE`,
        [pedidoId]
      );
      const horas: number = Number(weRes.rows?.[0]?.horas ?? 0);

      // 3) Quita la asignación (vuelve a 'pendiente' si estaba 'confirmado')
      await client.query(
        `UPDATE public.pedido
         SET asignado_a = NULL,
             estado = CASE WHEN estado = 'confirmado' THEN 'pendiente' ELSE estado END
         WHERE id = $1`,
        [pedidoId]
      );

      // 4) Borra la estimación del día
      await client.query(
        `DELETE FROM public.workload_estimacion
         WHERE pedido_id = $1 AND fecha = CURRENT_DATE`,
        [pedidoId]
      );

      return { ok: true, repartidorId, horas };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
