// app/api/admin/empleados/unassign-helper/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { ayudanteId } = await req.json();
  if (!ayudanteId) return NextResponse.json({ ok: false, error: "ayudanteId requerido" }, { status: 400 });

  try {
    await query(`DELETE FROM public.repartidor_ayudante WHERE ayudante_id = $1`, [ayudanteId]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
