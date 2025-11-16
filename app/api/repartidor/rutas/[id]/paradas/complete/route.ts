import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { tx } from "@/lib/db";

export async function POST(req: Request) {
  const repUserId = cookies().get("repartidor_id")?.value || null;
  if (!repUserId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { paradaId, resultado, notas } = await req.json(); // resultado: "completo" | "incompleto"

  try {
    await tx(async (client) => {
      const r = await client.query(
        `SELECT pr.id, pr.pedido_id, r.conductor_id, cd.usuario_id
         FROM public.parada_ruta pr
         JOIN public.ruta r ON r.id = pr.ruta_id
         JOIN public.conductor cd ON cd.id = r.conductor_id
         WHERE pr.id = $1
         FOR UPDATE`,
        [paradaId]
      );
      if ((r.rows?.length ?? 0) === 0) throw new Error("Parada no encontrada");
      const row = r.rows[0];
      if (String(row.usuario_id) !== repUserId) throw new Error("Forbidden");

      await client.query(`UPDATE public.parada_ruta SET salida_real = now(), estado = 'finalizado' WHERE id = $1`, [paradaId]);

      await client.query(
        `INSERT INTO public.pedido_entrega (pedido_id, repartidor_id, estado, motivo, nota)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.pedido_id, repUserId, resultado, resultado === "incompleto" ? "incidencia" : null, notas ?? null]
      );

      await client.query(`UPDATE public.pedido SET estado_entrega = $2 WHERE id = $1`, [row.pedido_id, resultado]);
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
