export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function getCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie") || "";
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(raw);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export async function GET(req: Request) {
  try {
    const adminId = getCookie(req.headers, "admin_id");
    if (!adminId) return NextResponse.json({ ok: false, msg: "solo_admin" }, { status: 403 });

    const url = new URL(req.url);
    const estado = url.searchParams.get("estado");          // borrador|pendiente|confirmado|cancelado|completado
    const ee = url.searchParams.get("ee");                  // pendiente|completo|incompleto
    const fechaMin = url.searchParams.get("fecha_min");     // YYYY-MM-DD
    const fechaMax = url.searchParams.get("fecha_max");     // YYYY-MM-DD

    const where: string[] = [];
    const vals: any[] = [];
    let i = 1;

    if (estado) { where.push(`p.estado = $${i++}`); vals.push(estado); }
    if (ee)     { where.push(`p.estado_entrega = $${i++}`); vals.push(ee); }
    if (fechaMin) { where.push(`p.fecha >= $${i++}::date`); vals.push(fechaMin); }
    if (fechaMax) { where.push(`p.fecha <= $${i++}::date`); vals.push(fechaMax); }

    const whereSql = where.length ? `where ${where.join(" and ")}` : "";

    const sql = `
      select
        p.id::text as id,
        p.folio,
        lpad(p.folio::text,3,'0') as folio_str,
        p.fecha::date::text as fecha,
        p.estado,
        p.estado_entrega,
        p.created_at::timestamptz::text as created_at,
        p.origen_direccion, p.origen_ciudad, p.origen_estado, p.origen_cp,
        p.destino_direccion, p.destino_ciudad, p.destino_estado, p.destino_cp,
        p.contacto_nombre, p.contacto_tel,
        u.id::text as repartidor_id,
        coalesce(u.nombre, u.email) as repartidor_nombre
      from public.pedido p
      left join public.usuario u on u.id = p.asignado_a
      ${whereSql}
      order by p.fecha asc nulls last, p.id asc
    `;

    const q = await pool.query(sql, vals);
    return NextResponse.json({ ok: true, rows: q.rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error_interno" }, { status: 500 });
  }
}
