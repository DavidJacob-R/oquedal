// app/api/admin/clientes/toggle/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id, activo } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });

  try {
    if (typeof activo === "boolean") {
      await query(`UPDATE public.cliente SET activo = $2 WHERE id = $1`, [id, activo]);
      return NextResponse.json({ ok: true, activo });
    } else {
      const cur = await query(`SELECT activo FROM public.cliente WHERE id = $1`, [id]);
      if (cur.rowCount === 0) throw new Error("Cliente no existe");
      const next = !cur.rows[0].activo;
      await query(`UPDATE public.cliente SET activo = $2 WHERE id = $1`, [id, next]);
      return NextResponse.json({ ok: true, activo: next });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
