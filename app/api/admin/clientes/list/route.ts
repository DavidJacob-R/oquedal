// app/api/admin/clientes/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const sql = `
      SELECT
        c.id,
        c.nombre,
        c.telefono,
        c.email,
        c.activo,
        c.usuario_id,
        alu.created_at AS creado_en,
        (SELECT COUNT(*) FROM public.pedido    p WHERE p.cliente_id = c.id) AS pedidos_count,
        (SELECT COUNT(*) FROM public.direccion d WHERE d.cliente_id = c.id) AS direcciones_count
      FROM public.cliente c
      LEFT JOIN public.auth_local_usuario alu ON alu.id = c.usuario_id
      ORDER BY c.activo DESC, LOWER(c.nombre) ASC
      LIMIT 1000
    `;
    const res = await query(sql);
    const clientes = (res.rows || []).map((r: any) => ({
      id: r.id,
      nombre: r.nombre,
      telefono: r.telefono,
      email: r.email,
      activo: !!r.activo,
      usuario_id: r.usuario_id || null,
      creado_en: r.creado_en || null,
      pedidos: Number(r.pedidos_count || 0),
      direcciones: Number(r.direcciones_count || 0),
    }));
    return NextResponse.json({ ok: true, clientes });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
