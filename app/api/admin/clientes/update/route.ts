// app/api/admin/clientes/update/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id, nombre, telefono, email } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });

  try {
    await query(
      `UPDATE public.cliente
       SET nombre = COALESCE($2, nombre),
           telefono = COALESCE($3, telefono),
           email = COALESCE($4, email)
       WHERE id = $1`,
      [id, nombre ?? null, telefono ?? null, email ?? null]
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
