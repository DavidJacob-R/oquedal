// app/api/admin/clientes/lista/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const sql = `
    SELECT c.id, c.nombre, c.email, c.telefono, c.activo,
           u.created_at AS creado_en
    FROM public.cliente c
    LEFT JOIN public.auth_local_usuario u ON u.id = c.usuario_id
    ORDER BY COALESCE(u.created_at, NOW()) DESC, c.nombre ASC
    LIMIT 500
  `;
  const res = await query(sql);
  return NextResponse.json({ ok: true, clientes: res.rows });
}
