export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type Canon = "aceptado" | "rechazado" | "pendiente";
type DbEstado = "pendiente" | "confirmado" | "cancelado";

// Normalizamos muchas variantes (aceptar, aprobar, cancelar, etc.) a solo 3 estados canonicos
const CANON = new Map<string, Canon>([
  // ACEPTADO
  ["aceptado", "aceptado"],
  ["aprobado", "aceptado"],
  ["confirmado", "aceptado"],
  ["ok", "aceptado"],
  ["aceptar", "aceptado"],
  ["aprobar", "aceptado"],

  // RECHAZADO / CANCELADO
  ["rechazado", "rechazado"],
  ["denegado", "rechazado"],
  ["cancelado", "rechazado"],
  ["cancel", "rechazado"],
  ["cancelado_por_admin", "rechazado"],
  ["cancelled", "rechazado"],
  ["reject", "rechazado"],
  ["rejected", "rechazado"],

  // PENDIENTE
  ["pendiente", "pendiente"],
  ["pending", "pendiente"],
]);

function canonToDb(c: Canon): DbEstado {
  if (c === "aceptado") return "confirmado";
  if (c === "rechazado") return "cancelado";
  return "pendiente";
}

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const id = String((b as any)?.id || "").trim();

    // Permitimos que el frontend mande "estado" o "accion"
    const raw = ((b as any)?.estado ?? (b as any)?.accion ?? "")
      .toString()
      .trim()
      .toLowerCase();

    const canon = CANON.get(raw);
    if (!id || !canon) {
      return NextResponse.json(
        { ok: false, msg: "datos_invalidos" },
        { status: 400 }
      );
    }

    const nuevoEstado: DbEstado = canonToDb(canon);

    const q = await pool.query(
      `
      UPDATE public.pedido
      SET estado = $2::text
      WHERE id = $1::uuid
      RETURNING id::text, estado
      `,
      [id, nuevoEstado]
    );

    if (!q.rowCount) {
      return NextResponse.json(
        { ok: false, msg: "no_encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: q.rows[0].id,
      estado: q.rows[0].estado,
      canon,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, msg: "error_interno" },
      { status: 500 }
    );
  }
}
