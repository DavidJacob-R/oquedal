export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";

type Estado = "pendiente" | "confirmado" | "cancelado";

function mapAccionToEstado(accion?: string | null): Estado | null {
  const a = String(accion ?? "").toLowerCase();
  if (a === "aceptar" || a === "aprobar") return "confirmado";
  if (a === "rechazar" || a === "cancelar") return "cancelado";
  if (a === "restaurar" || a === "pendiente") return "pendiente";
  return null;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const adminId = cookies().get("admin_id")?.value || null;
  if (!adminId) return NextResponse.json({ ok: false, msg: "no autorizado" }, { status: 401 });

  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ ok: false, msg: "id requerido" }, { status: 400 });

  const client = await pool.connect();
  try {
    const q = await client.query(
      `
      SELECT
        p.id::text AS id,
        p.folio, lpad(p.folio::text, 3, '0') AS folio_str,
        p.tipo, p.estado,
        to_char(p.fecha,'YYYY-MM-DD') AS fecha,
        to_char(timezone('UTC', p.created_at),'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
        p.origen_direccion AS origen, p.destino_direccion AS destino,
        p.contacto_nombre, p.contacto_tel, p.descripcion,
        c.id::text AS cliente_id, c.nombre AS cliente_nombre, c.telefono AS cliente_tel, c.email AS cliente_email
      FROM public.pedido p
      JOIN public.cliente c ON c.id = p.cliente_id
      WHERE p.id = $1::uuid
      LIMIT 1
      `,
      [id]
    );
    if (!q.rowCount) return NextResponse.json({ ok: false, msg: "no encontrado" }, { status: 404 });

    const qi = await client.query(
      `
      SELECT i.id::text, i.cantidad, i.peso_kg,
             pr.nombre, pr.sku, pr.unidad
      FROM public.pedido_item i
      JOIN public.producto pr ON pr.id = i.producto_id
      WHERE i.pedido_id = $1::uuid
      ORDER BY pr.nombre ASC
      `,
      [id]
    );

    return NextResponse.json({ ok: true, pedido: q.rows[0], items: qi.rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error interno" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const adminId = cookies().get("admin_id")?.value || null;
  if (!adminId) return NextResponse.json({ ok: false, msg: "no autorizado" }, { status: 401 });

  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ ok: false, msg: "id requerido" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as {
    accion?: string;
    estado?: string;
    observacion?: string;
  } | null;

  const obs = typeof body?.observacion === "string" ? body!.observacion.trim() : "";

  let nuevoEstado: Estado | null = null;

  if (typeof body?.estado === "string") {
    const e = body.estado.toLowerCase();
    if (e === "pendiente" || e === "confirmado" || e === "cancelado") {
      nuevoEstado = e as Estado;
    }
  }
  if (!nuevoEstado) {
    nuevoEstado = mapAccionToEstado(body?.accion);
  }
  if (!nuevoEstado) {
    return NextResponse.json({ ok: false, msg: "accion/estado invalido" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const sql = `
      UPDATE public.pedido
      SET estado = $1::text,
          descripcion = CASE
            WHEN coalesce($2::text,'') = '' THEN descripcion
            ELSE coalesce(descripcion,'') || E'\n' || '[OBS '|| to_char(now(),'YYYY-MM-DD HH24:MI') || '] ' || $2::text
          END
      WHERE id = $3::uuid
      RETURNING id::text
    `;
    const r = await client.query(sql, [nuevoEstado, obs, id]);
    if (!r.rowCount) return NextResponse.json({ ok: false, msg: "no encontrado" }, { status: 404 });

    return NextResponse.json({ ok: true, id, estado: nuevoEstado });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error interno" }, { status: 500 });
  } finally {
    client.release();
  }
}
  