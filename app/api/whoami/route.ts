// app/api/whoami/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const c = cookies();
  const adminId = c.get("admin_id")?.value || null;
  const repId   = c.get("repartidor_id")?.value || null;
  const cliId   = c.get("usuario_id")?.value || null;

  try {
    if (adminId) {
      const r = await query(`SELECT nombre FROM public.usuario WHERE id = $1`, [adminId]);
      const nombre = r.rows?.[0]?.nombre ?? "Admin";
      return NextResponse.json({ ok: true, user: { id: adminId, nombre, rol: "admin" } });
    }
    if (repId) {
      // Cualquier usuario con cookie de repartidor (conductor ≡ repartidor)
      const r = await query(
        `SELECT u.nombre
         FROM public.usuario u
         WHERE u.id = $1
         LIMIT 1`,
        [repId]
      );
      const nombre = r.rows?.[0]?.nombre ?? "Repartidor";
      return NextResponse.json({ ok: true, user: { id: repId, nombre, rol: "repartidor" } });
    }
    if (cliId) {
      const r = await query(
        `SELECT COALESCE(c.nombre, alu.nombre) AS nombre
         FROM public.auth_local_usuario alu
         LEFT JOIN public.cliente c ON c.usuario_id = alu.id
         WHERE alu.id = $1
         LIMIT 1`,
        [cliId]
      );
      const nombre = r.rows?.[0]?.nombre ?? "Cliente";
      return NextResponse.json({ ok: true, user: { id: cliId, nombre, rol: "cliente" } });
    }
    return NextResponse.json({ ok: true, user: null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
