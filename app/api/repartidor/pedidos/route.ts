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
function getUid(req: Request): string | null {
  return readCookie(req.headers, "usuario_id") || (req.headers.get("x-usuario-id") || "").trim() || null;
}
function getRol(req: Request): string {
  return readCookie(req.headers, "rol") || "";
}

export async function GET(req: Request) {
  try {
    const uid = getUid(req);
    const rol = getRol(req);
    if (!uid) return NextResponse.json({ ok:false, msg:"no_autorizado" }, { status: 401 });
    if (rol !== "repartidor") return NextResponse.json({ ok:false, msg:"solo_repartidor" }, { status: 403 });

    const rows = await pool.query(
      `
      select
        p.id::text as id,
        p.folio,
        lpad(p.folio::text,3,'0') as folio_str,
        p.fecha::date::text as fecha,
        p.created_at::timestamptz::text as created_at,
        p.origen_direccion, p.origen_ciudad, p.origen_estado, p.origen_cp,
        p.destino_direccion, p.destino_ciudad, p.destino_estado, p.destino_cp,
        p.contacto_nombre, p.contacto_tel,
        (p.origen_direccion || ', ' || coalesce(p.origen_ciudad,'') || ', ' || coalesce(p.origen_estado,'') || ', ' || coalesce(p.origen_cp,'')) as origen,
        (p.destino_direccion || ', ' || coalesce(p.destino_ciudad,'') || ', ' || coalesce(p.destino_estado,'') || ', ' || coalesce(p.destino_cp,'')) as destino
      from public.pedido p
      join public.cliente c on c.id = p.cliente_id
      where
        lower(coalesce(p.estado, p.accion, 'pendiente')) in ('confirmado','aceptado','aprobado')
        and p.estado_entrega = 'pendiente'
      order by p.fecha asc nulls last, p.id asc
      `
    );

    return NextResponse.json({ ok:true, rows: rows.rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok:false, msg:"error_interno" }, { status: 500 });
  }
}
