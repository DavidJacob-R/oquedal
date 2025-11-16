import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { tx } from "@/lib/db";

export async function POST(req: Request) {
  const repUserId = cookies().get("repartidor_id")?.value || null;
  if (!repUserId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { paradaId, motivo } = await req.json();

  try {
    await tx(async (client) => {
      const r = await client.query(
        `SELECT pr.id, pr.ruta_id, r.conductor_id, cd.usuario_id
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

      await client.query(`UPDATE public.parada_ruta SET estado = 'pospuesto' WHERE id = $1`, [paradaId]);

      if (motivo && String(motivo).trim().length) {
        await client.query(
          `INSERT INTO public.incidencia (ruta_id, parada_id, tipo_id, descripcion, reportado_por)
           VALUES ($1, $2, $3, $4, $5)`,
          [row.ruta_id, paradaId, 1, motivo, repUserId]
        );
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
