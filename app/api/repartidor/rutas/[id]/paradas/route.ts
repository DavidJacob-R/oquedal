export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const repUserId = cookies().get("repartidor_id")?.value || null;
  if (!repUserId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const rutaId = params.id;

  try {
    // Validar que la ruta pertenezca al repartidor logueado
    const own = await query(
      `SELECT 1
       FROM public.ruta r
       JOIN public.conductor c ON c.id = r.conductor_id
       WHERE r.id = $1 AND c.usuario_id = $2
       LIMIT 1`,
      [rutaId, repUserId]
    );
    if ((own.rows?.length ?? 0) === 0) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Traer TODA la info esencial del pedido para mostrar en la tarjeta
    const res = await query(
      `SELECT 
         pr.id                 AS parada_id,
         pr.secuencia,
         pr.estado             AS estado_parada,
         pr.eta,
         pr.llegada_real,
         pr.salida_real,

         p.id                  AS pedido_id,
         p.folio,
         p.estado_entrega,
         p.contacto_nombre,
         p.contacto_tel,
         p.franja_horaria,
         p.descripcion,
         p.volumen_m3,
         p.peso_kg,
         p.precio_estimado,

         -- origen
         p.origen_direccion,
         p.origen_ciudad,
         p.origen_estado,
         p.origen_cp,
         -- destino
         p.destino_direccion,
         p.destino_ciudad,
         p.destino_estado,
         p.destino_cp,

         c.nombre              AS cliente
       FROM public.parada_ruta pr
       JOIN public.pedido p  ON p.id = pr.pedido_id
       JOIN public.cliente c ON c.id = p.cliente_id
       WHERE pr.ruta_id = $1
       ORDER BY pr.secuencia ASC`,
      [rutaId]
    );

    const paradas = (res.rows || []).map((r: any) => ({
      id: String(r.parada_id),
      secuencia: Number(r.secuencia),
      estado: r.estado_parada ?? null,
      eta: r.eta,
      llegada_real: r.llegada_real,
      salida_real: r.salida_real,

      pedido_id: String(r.pedido_id),
      folio: Number(r.folio),
      estado_entrega: r.estado_entrega as string | null,

      contacto_nombre: (r.contacto_nombre ?? "") as string,
      contacto_tel: (r.contacto_tel ?? "") as string,
      franja_horaria: (r.franja_horaria ?? "") as string,
      descripcion: (r.descripcion ?? "") as string,
      volumen_m3: r.volumen_m3 == null ? null : Number(r.volumen_m3),
      peso_kg: r.peso_kg == null ? null : Number(r.peso_kg),
      precio_estimado: r.precio_estimado == null ? null : Number(r.precio_estimado),

      origen: {
        direccion: r.origen_direccion as string | null,
        ciudad: r.origen_ciudad as string | null,
        estado: r.origen_estado as string | null,
        cp: r.origen_cp as string | null,
      },
      destino: {
        direccion: r.destino_direccion as string | null,
        ciudad: r.destino_ciudad as string | null,
        estado: r.destino_estado as string | null,
        cp: r.destino_cp as string | null,
      },

      cliente: r.cliente as string,
    }));

    return NextResponse.json({ ok: true, paradas });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
