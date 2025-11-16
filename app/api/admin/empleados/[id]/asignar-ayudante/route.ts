// app/api/admin/empleados/[id]/asignar-ayudante/route.ts
import { NextResponse } from "next/server";
import { tx, query } from "@/lib/db";

/**
 * params.id = repartidor_id (usuario.id)
 * body: { ayudanteId: string }
 * - Máximo 3 ayudantes por repartidor.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const repartidorId = params.id;
  const { ayudanteId } = await req.json();

  if (!ayudanteId) {
    return NextResponse.json({ ok: false, error: "ayudanteId requerido" }, { status: 400 });
  }

  // validar conteo actual
  const cnt = await query<{ n: string }>(
    `SELECT COUNT(*)::int as n FROM public.ayudante_relacion WHERE repartidor_id=$1`,
    [repartidorId]
  );
  const n = Number(cnt.rows[0]?.n || 0);
  if (n >= 3) {
    return NextResponse.json({ ok: false, error: "Máximo 3 ayudantes por repartidor" }, { status: 409 });
  }

  try {
    await tx(async (client: any) => {
      // validar que ambos usuarios existan y roles correctos
      const rep = await client.query(
        `SELECT u.id, r.nombre AS rol FROM public.usuario u LEFT JOIN public.rol r ON r.id=u.rol_id WHERE u.id=$1 AND u.activo=true`,
        [repartidorId]
      );
      const ay = await client.query(
        `SELECT u.id, r.nombre AS rol FROM public.usuario u LEFT JOIN public.rol r ON r.id=u.rol_id WHERE u.id=$1 AND u.activo=true`,
        [ayudanteId]
      );
      if (rep.rowCount === 0) throw new Error("Repartidor no existe");
      if (ay.rowCount === 0) throw new Error("Ayudante no existe");
      if ((rep.rows[0].rol || "").toLowerCase() !== "repartidor") throw new Error("Usuario no es repartidor");
      if ((ay.rows[0].rol || "").toLowerCase() !== "ayudante") throw new Error("Usuario no es ayudante");

      await client.query(
        `INSERT INTO public.ayudante_relacion (repartidor_id, ayudante_id)
         VALUES ($1, $2)
         ON CONFLICT (repartidor_id,ayudante_id) DO NOTHING`,
        [repartidorId, ayudanteId]
      );
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 400 });
  }
}
