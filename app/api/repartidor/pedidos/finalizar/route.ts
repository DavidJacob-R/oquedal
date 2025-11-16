// app/api/repartidor/pedidos/finalizar/route.ts
import { NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { cookies } from "next/headers";

type Body = {
  pedidoId: string;
  paradaId: string;
};

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const repartidorUserId = cookies().get("repartidor_id")?.value || null;
  if (!repartidorUserId) {
    return NextResponse.json(
      { ok: false, error: "No autenticado (repartidor)" },
      { status: 401 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body inválido" },
      { status: 400 }
    );
  }

  const { pedidoId, paradaId } = body;
  if (!pedidoId || !paradaId) {
    return NextResponse.json(
      { ok: false, error: "Faltan pedidoId o paradaId" },
      { status: 400 }
    );
  }

  try {
    const out = await tx(async (client) => {
      const q = await client.query(
        `
        SELECT
          pr.id          AS parada_id,
          p.id           AS pedido_id,
          r.id           AS ruta_id,
          c.usuario_id   AS repartidor_user_id,
          p.estado,
          p.estado_entrega
        FROM public.parada_ruta pr
        JOIN public.ruta r      ON r.id = pr.ruta_id
        JOIN public.conductor c ON c.id = r.conductor_id
        JOIN public.pedido p    ON p.id = pr.pedido_id
        WHERE pr.id = $1
          AND p.id  = $2
        LIMIT 1
        `,
        [paradaId, pedidoId]
      );

      if (!q.rows.length) {
        throw new Error("Parada/Pedido no encontrado o no ligado a ruta");
      }

      const row = q.rows[0];

      if (String(row.repartidor_user_id) !== repartidorUserId) {
        throw new Error("No puedes finalizar un pedido de otro repartidor");
      }

      if (row.estado === "completado" || row.estado_entrega === "completo") {
        return { already: true };
      }

      await client.query(
        `
        UPDATE public.parada_ruta
           SET estado = 'completado',
               llegada_real = COALESCE(llegada_real, now()),
               salida_real  = COALESCE(salida_real,  now())
         WHERE id = $1
        `,
        [paradaId]
      );

      await client.query(
        `
        UPDATE public.pedido
           SET estado = 'completado',
               estado_entrega = 'completo'
         WHERE id = $1
        `,
        [pedidoId]
      );

      await client.query(
        `
        INSERT INTO public.pedido_entrega (pedido_id, repartidor_id, estado, motivo, nota)
        VALUES ($1,
                $2,
                'completo',
                NULL,
                NULL)
        `,
        [pedidoId, repartidorUserId]
      );

      return { already: false };
    });

    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    console.error("finalizar pedido error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 400 }
    );
  }
}
