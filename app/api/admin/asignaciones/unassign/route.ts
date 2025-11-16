// app/api/admin/asignaciones/unassign/route.ts
import { NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { pedidoId } = await req.json();
  if (!pedidoId) return NextResponse.json({ ok: false, error: "pedidoId requerido" }, { status: 400 });

  try {
    await tx(async (client: any) => {
      // limpiar asignación
      await client.query(
        `UPDATE public.pedido
         SET asignado_a = NULL,
             estado = CASE
               WHEN estado IN ('confirmado') THEN 'pendiente'
               ELSE estado
             END
         WHERE id=$1`,
        [pedidoId]
      );

      // borrar estimación del día
      await client.query(
        `DELETE FROM public.workload_estimacion
         WHERE fecha = CURRENT_DATE AND pedido_id = $1`,
        [pedidoId]
      );
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 400 });
  }
}
