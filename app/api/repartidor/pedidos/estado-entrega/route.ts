export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function readCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie") || "";
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`, "i").exec(raw);
  if (!m?.[1]) return null;
  const v = decodeURIComponent(m[1]);
  if (!v || v === "undefined" || v === "null") return null;
  return v;
}
function getRol(req: Request): string {
  return readCookie(req.headers, "rol") || "";
}

const BASE_SEL = `
  p.id::text as id,
  p.folio, lpad(p.folio::text,3,'0') as folio_str,
  p.fecha::date::text as fecha,
  p.estado_entrega,
  p.origen_direccion, p.origen_ciudad, p.origen_estado, p.origen_cp,
  p.destino_direccion, p.destino_ciudad, p.destino_estado, p.destino_cp,
  p.contacto_nombre, p.contacto_tel
`;

export async function GET(req: Request) {
  try {
    const rol = getRol(req);
    if (rol !== "admin") return NextResponse.json({ ok:false, msg:"solo_admin" }, { status: 403 });

    const pendientes = await pool.query(
      `select ${BASE_SEL}
         from public.pedido p
        where lower(coalesce(p.estado, p.accion, 'pendiente')) in ('confirmado','aceptado','aprobado')
          and p.estado_entrega = 'pendiente'
        order by p.fecha asc nulls last, p.id asc`
    );

    const completos = await pool.query(
      `select ${BASE_SEL},
              pe.created_at::timestamptz::text as entregado_en
         from public.pedido p
         join lateral (
           select created_at from public.pedido_entrega e
            where e.pedido_id = p.id and e.estado = 'completo'
            order by created_at desc limit 1
         ) pe on true
        where p.estado_entrega = 'completo'
        order by pe.created_at desc nulls last, p.id desc`
    );

    const incompletos = await pool.query(
      `select ${BASE_SEL},
              e.motivo, e.nota, e.created_at::timestamptz::text as marcado_en
         from public.pedido p
         join lateral (
           select motivo, nota, created_at from public.pedido_entrega e
            where e.pedido_id = p.id and e.estado = 'incompleto'
            order by created_at desc limit 1
         ) e on true
        where p.estado_entrega = 'incompleto'
        order by e.created_at desc nulls last, p.id desc`
    );

    return NextResponse.json({
      ok: true,
      pendientes: pendientes.rows,
      completos: completos.rows,
      incompletos: incompletos.rows
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok:false, msg:"error_interno" }, { status: 500 });
  }
}
