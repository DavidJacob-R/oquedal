// app/api/admin/empleados/[id]/route.ts
import { NextResponse } from "next/server";
import { tx } from "@/lib/db";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  try {
    await tx(async (client: any) => {
      await client.query(`UPDATE public.usuario SET activo=false WHERE id=$1`, [id]);
    });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 400 });
  }
}
