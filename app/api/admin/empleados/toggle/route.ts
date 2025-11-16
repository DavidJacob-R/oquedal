// app/api/admin/empleados/toggle/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { tx } from "@/lib/db";

export async function POST(req: Request) {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });

  try {
    const result = await tx(async (client: any) => {
      const cur = await client.query(`SELECT activo FROM public.usuario WHERE id = $1`, [id]);
      if (cur.rowCount === 0) throw new Error("Empleado no existe");
      const next = !cur.rows[0].activo;

      await client.query(`UPDATE public.usuario SET activo = $2 WHERE id = $1`, [id, next]);

      // si es repartidor y hay registro de conductor, sincronizar activo
      await client.query(`UPDATE public.conductor SET activo = $2 WHERE usuario_id = $1`, [id, next]);

      return { ok: true, activo: next };
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
