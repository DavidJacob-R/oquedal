export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";

function normEstado(v: string | null): "todos" | "pendiente" | "confirmado" | "cancelado" {
  const s = String(v || "todos").toLowerCase();
  if (s === "pendientes") return "pendiente";
  if (s === "aceptados" || s === "aprobados") return "confirmado";
  if (s === "cancelados" || s === "rechazados") return "cancelado";
  if (s === "pendiente" || s === "confirmado" || s === "cancelado") return s as any;
  return "todos";
}

export async function GET(req: NextRequest) {
  try {
    const adminId = cookies().get("admin_id")?.value || null;
    if (!adminId) return NextResponse.json({ ok:false, msg:"admin_required" }, { status: 401 });

    const sp = req.nextUrl?.searchParams ?? new URLSearchParams();
    const estadoParam = normEstado(sp.get("estado"));
    const q = (sp.get("q") || "").trim().toLowerCase();
    const limit = Math.min(Number(sp.get("limit") || 200), 200);
    const offset = Math.max(Number(sp.get("offset") || 0), 0);

    const where: string[] = [];
    const vals: any[] = [];
    let i = 1;

    if (q) {
      where.push(`(
        lower(p.origen_direccion) LIKE $${i} OR lower(p.destino_direccion) LIKE $${i} OR
        lower(p.contacto_nombre) LIKE $${i} OR lower(p.contacto_tel) LIKE $${i} OR
        lower(c.nombre) LIKE $${i} OR lower(coalesce(c.email,'')) LIKE $${i} OR
        lpad(p.folio::text,3,'0') LIKE $${i}
      )`);
      vals.push(`%${q}%`);
      i++;
    }
    if (estadoParam !== "todos") {
      where.push(`p.estado = $${i}`);
      vals.push(estadoParam);
      i++;
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        p.id::text                  AS id,
        p.folio                     AS folio,
        lpad(p.folio::text, 3, '0') AS folio_str,
        p.tipo                      AS tipo,
        p.estado                    AS estado,
        to_char(p.fecha,'YYYY-MM-DD') AS fecha,
        to_char(timezone('UTC', p.created_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
        p.origen_direccion          AS origen,
        p.destino_direccion         AS destino,
        p.contacto_nombre           AS contacto_nombre,
        p.contacto_tel              AS contacto_tel,
        c.id::text                  AS cliente_id,
        c.nombre                    AS cliente_nombre,
        c.telefono                  AS cliente_tel,
        c.email                     AS cliente_email
      FROM public.pedido p
      JOIN public.cliente c ON c.id = p.cliente_id
      ${whereSQL}
      ORDER BY p.folio ASC NULLS LAST, p.created_at ASC NULLS LAST
      LIMIT $${i} OFFSET $${i+1}
    `;
    // Son los datos para el LIMIT y OFFSET
    vals.push(limit, offset);

    const data = await pool.query(sql, vals);
    return NextResponse.json({ ok:true, pedidos: data.rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok:false, msg:"error_servidor" }, { status: 500 });
  }
}
