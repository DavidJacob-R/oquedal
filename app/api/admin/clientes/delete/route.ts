// app/api/admin/clientes/delete/route.ts
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
      const chk = await client.query(
        `SELECT
           (SELECT COUNT(*) FROM public.pedido    p WHERE p.cliente_id = $1) AS pedidos,
           (SELECT COUNT(*) FROM public.direccion d WHERE d.cliente_id = $1) AS direcciones`,
        [id]
      );
      const pedidos = Number(chk.rows?.[0]?.pedidos || 0);
      const direcciones = Number(chk.rows?.[0]?.direcciones || 0);
      if (pedidos > 0 || direcciones > 0) {
        throw new Error("No se puede eliminar: tiene pedidos o direcciones asociadas. Desactívalo en su lugar.");
      }
      await client.query(`DELETE FROM public.cliente WHERE id = $1`, [id]);
      return { ok: true };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
