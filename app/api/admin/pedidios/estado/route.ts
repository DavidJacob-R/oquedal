export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

const CANON = new Map<string, "aceptado" | "rechazado" | "pendiente">([
  ["aceptado","aceptado"], ["aprobado","aceptado"], ["accept","aceptado"], ["accepted","aceptado"], ["approve","aceptado"], ["approved","aceptado"], ["ok","aceptado"], ["confirmado","aceptado"], ["confirmar","aceptado"], ["aceptar","aceptado"], ["acepto","aceptado"],
  ["rechazado","rechazado"], ["denegado","rechazado"], ["reject","rechazado"], ["rejected","rechazado"], ["rechazar","rechazado"], ["rechazo","rechazado"], ["cancelado","rechazado"], ["cancelled","rechazado"], ["cancelado_por_admin","rechazado"],
  ["pendiente","pendiente"]
]);

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const id = String(b?.id || "").trim();
    const estadoRaw = String(b?.estado || "").trim().toLowerCase();
    const estado = CANON.get(estadoRaw);
    if (!id || !estado) {
      return NextResponse.json({ ok: false, msg: "datos_invalidos" }, { status: 400 });
    }

    // intenta actualizar columna 'estado'; si no existe, intenta 'accion'
    try {
      const q = await pool.query(
        `update public.pedido set estado = $2 where id = $1::uuid returning id, estado`,
        [id, estado]
      );
      if (q.rowCount) return NextResponse.json({ ok: true, row: q.rows[0] });
    } catch (e: any) {
      if (e?.code !== "42703") throw e; // columna no existe
    }

    try {
      const q2 = await pool.query(
        `update public.pedido set accion = $2 where id = $1::uuid returning id, accion as estado`,
        [id, estado]
      );
      if (q2.rowCount) return NextResponse.json({ ok: true, row: q2.rows[0] });
    } catch (e: any) {
      if (e?.code !== "42703") throw e;
    }

    return NextResponse.json({ ok: false, msg: "columna_estado_no_encontrada" }, { status: 500 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error_interno" }, { status: 500 });
  }
}
