// app/api/admin/empleados/assign-helper/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { tx } from "@/lib/db";

export async function POST(req: Request) {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { repartidorId, ayudanteId } = await req.json();
  if (!repartidorId || !ayudanteId) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const result = await tx(async (client: any) => {
      // validar que repartidor exista y esté activo
      const rep = await client.query(
        `SELECT u.id FROM public.usuario u WHERE u.id = $1 AND u.activo = true`,
        [repartidorId]
      );
      if (rep.rowCount === 0) throw new Error("Repartidor no existe/activo");

      // validar ayudante libre (UNIQUE por ayudante_id)
      const ya = await client.query(
        `SELECT 1 FROM public.repartidor_ayudante WHERE ayudante_id = $1`,
        [ayudanteId]
      );
      if (ya.rowCount > 0) throw new Error("Ayudante ya está asignado a un repartidor");

      // validar cupo (máx 3)
      const cnt = await client.query(
        `SELECT COUNT(*)::int AS c FROM public.repartidor_ayudante WHERE repartidor_id = $1`,
        [repartidorId]
      );
      const c = Number(cnt.rows[0].c || 0);
      if (c >= 3) throw new Error("Este repartidor ya tiene 3 ayudantes (tope)");

      // asignar
      await client.query(
        `INSERT INTO public.repartidor_ayudante (repartidor_id, ayudante_id) VALUES ($1,$2)`,
        [repartidorId, ayudanteId]
      );

      return { ok: true };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
