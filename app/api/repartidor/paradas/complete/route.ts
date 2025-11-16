import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { tx } from "@/lib/db";

export const dynamic = "force-dynamic";

type Body = { paradaId: string; resultado: "completo" | "incompleto"; notas?: string };

export async function POST(req: Request) {
  const repUserId = cookies().get("repartidor_id")?.value || null;
  if (!repUserId) return NextResponse.json({ ok:false, error:"Unauthorized" }, { status:401 });

  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok:false, error:"Bad JSON" }, { status:400 }); }
  if (!body?.paradaId || !body?.resultado) {
    return NextResponse.json({ ok:false, error:"paradaId y resultado requeridos" }, { status:400 });
  }

  try {
    await tx(async (client) => {
      // Validar y obtener info
      const r0 = await client.query(
        `SELECT pr.id, pr.ruta_id, pr.pedido_id, pr.salida_real
           FROM public.parada_ruta pr
           JOIN public.ruta r  ON r.id = pr.ruta_id
           JOIN public.conductor c ON c.id = r.conductor_id
          WHERE pr.id = $1 AND c.usuario_id = $2
          LIMIT 1`,
        [body.paradaId, repUserId]
      );
      if (!(r0.rows?.length)) throw new Error("Parada no encontrada o no permitida");
      const rutaId    = String(r0.rows[0].ruta_id);
      const pedidoId  = String(r0.rows[0].pedido_id);
      const yaSalio   = !!r0.rows[0].salida_real;

      // Cerrar parada
      if (!yaSalio) {
        await client.query(
          `UPDATE public.parada_ruta
              SET salida_real = now(),
                  estado = 'finalizada'
            WHERE id = $1`,
          [body.paradaId]
        );
      }

      // Registrar resultado de entrega (opcional pero útil)
      await client.query(
        `INSERT INTO public.pedido_entrega (pedido_id, estado, motivo, nota, creado_en)
         VALUES ($1, $2, NULL, $3, now())`,
        [pedidoId, body.resultado, body.notas ?? null]
      );

      // Actualizar pedido (estado/estado_entrega)
      if (body.resultado === "completo") {
        await client.query(
          `UPDATE public.pedido
              SET estado = 'completado',
                  estado_entrega = 'completo'
            WHERE id = $1`,
          [pedidoId]
        );
      } else {
        await client.query(
          `UPDATE public.pedido
              SET estado = 'confirmado',
                  estado_entrega = 'incompleto'
            WHERE id = $1`,
          [pedidoId]
        );
      }

      // ¿Quedan paradas sin finalizar?
      const pleft = await client.query(
        `SELECT COUNT(*)::int AS pending
           FROM public.parada_ruta
          WHERE ruta_id = $1
            AND salida_real IS NULL`,
        [rutaId]
      );
      const pending = Number(pleft.rows[0].pending || 0);

      // Si no quedan, ruta = completada
      if (pending === 0) {
        await client.query(
          `UPDATE public.ruta SET estado = 'completada' WHERE id = $1`,
          [rutaId]
        );
      } else {
        // aseguramos que no vuelva a 'planificada'
        await client.query(
          `UPDATE public.ruta SET estado = 'en_ruta' WHERE id = $1 AND estado <> 'completada'`,
          [rutaId]
        );
      }
    });

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message || e) }, { status:400 });
  }
}
