import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { tx } from "@/lib/db";

export const dynamic = "force-dynamic";

type Body = { paradaId: string };

export async function POST(req: Request) {
  const repUserId = cookies().get("repartidor_id")?.value || null;
  if (!repUserId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok:false, error:"Bad JSON" }, { status:400 }); }
  if (!body?.paradaId) return NextResponse.json({ ok:false, error:"paradaId requerido" }, { status:400 });

  try {
    await tx(async (client) => {
      // Validar que la parada pertenece al repartidor
      const r0 = await client.query(
        `SELECT pr.id, pr.ruta_id, pr.llegada_real
           FROM public.parada_ruta pr
           JOIN public.ruta r  ON r.id = pr.ruta_id
           JOIN public.conductor c ON c.id = r.conductor_id
          WHERE pr.id = $1 AND c.usuario_id = $2
          LIMIT 1`,
        [body.paradaId, repUserId]
      );
      if (!(r0.rows?.length)) throw new Error("Parada no encontrada o no permitida");
      const rutaId = String(r0.rows[0].ruta_id);
      const yaLlego = !!r0.rows[0].llegada_real;

      // Llegada (si no estaba)
      if (!yaLlego) {
        await client.query(
          `UPDATE public.parada_ruta
              SET llegada_real = now(),
                  estado = 'en_proceso'
            WHERE id = $1`,
          [body.paradaId]
        );
      }

      // Asegurar estado de la ruta = en_ruta
      await client.query(
        `UPDATE public.ruta
            SET estado = 'en_ruta'
          WHERE id = $1 AND estado <> 'completada'`,
        [rutaId]
      );
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:String(e?.message || e) }, { status:400 });
  }
}
