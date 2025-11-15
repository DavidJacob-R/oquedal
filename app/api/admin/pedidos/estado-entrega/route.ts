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

    const sql = `
      select
        p.id::text as id,
        p.folio,
        lpad(p.folio::text,3,'0') as folio_str,
        p.fecha::date::text as fecha,
        p.estado,
        p.origen_direccion, p.origen_ciudad, p.origen_estado, p.origen_cp,
        p.destino_direccion, p.destino_ciudad, p.destino_estado, p.destino_cp,
        p.contacto_nombre, p.contacto_tel,
        ult.estado as ult_estado,
        ult.creado_en as ult_creado_en,
        ult.motivo as ult_motivo,
        ult.nota as ult_nota
      from public.pedido p
      left join lateral (
        select pe.estado, pe.creado_en, pe.motivo, pe.nota
        from public.pedido_entrega pe
        where pe.pedido_id = p.id
        order by pe.creado_en desc
        limit 1
      ) ult on true
      where p.estado in ('confirmado','completado')
      order by p.fecha asc nulls last, p.id asc
    `;

    const q = await pool.query(sql);

    const pendientes: any[] = [];
    const completos: any[] = [];
    const incompletos: any[] = [];

    for (const r of q.rows) {
      const base = {
        id: r.id,
        folio: r.folio,
        folio_str: r.folio_str,
        fecha: r.fecha,
        estado: r.estado,
        origen_direccion: r.origen_direccion,
        origen_ciudad: r.origen_ciudad,
        origen_estado: r.origen_estado,
        origen_cp: r.origen_cp,
        destino_direccion: r.destino_direccion,
        destino_ciudad: r.destino_ciudad,
        destino_estado: r.destino_estado,
        destino_cp: r.destino_cp,
        contacto_nombre: r.contacto_nombre,
        contacto_tel: r.contacto_tel,
      };

      if (r.ult_estado === "completo") {
        completos.push({
          ...base,
          estado_entrega: "completo",
          entregado_en: r.ult_creado_en,
          motivo: null,
          nota: null,
          marcado_en: r.ult_creado_en,
        });
      } else if (r.ult_estado === "incompleto") {
        incompletos.push({
          ...base,
          estado_entrega: "incompleto",
          entregado_en: null,
          motivo: r.ult_motivo,
          nota: r.ult_nota,
          marcado_en: r.ult_creado_en,
        });
      } else {
        pendientes.push({
          ...base,
          estado_entrega: "pendiente",
          entregado_en: null,
          motivo: null,
          nota: null,
          marcado_en: null,
        });
      }
    }

    return NextResponse.json({ ok: true, pendientes, completos, incompletos });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error_interno" }, { status: 500 });
  }
}
