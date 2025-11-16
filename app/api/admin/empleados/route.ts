// app/api/admin/empleados/route.ts
import { NextResponse } from "next/server";
import { tx } from "@/lib/db";
import { ensureRole } from "@/lib/roles";

/**
 * body: { nombre: string, email?: string, telefono?: string, rol: 'repartidor'|'ayudante', licencia?: boolean }
 * - Crea un usuario activo con rol indicado.
 * - Si rol='repartidor' crea fila en public.conductor con 'licencia' (texto 'SI'/'NO').
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { nombre, email, telefono, rol, licencia } = body || {};

  if (!nombre || !rol) {
    return NextResponse.json({ ok: false, error: "nombre y rol requeridos" }, { status: 400 });
  }

  try {
    const result = await tx(async (client: any) => {
      // asegurar rol
      const rolId = await ensureRole(rol.toLowerCase());

      // crear usuario (pass_hash dummy: debes cifrar real en tu flujo)
      const userRes = await client.query(
        `INSERT INTO public.usuario (rol_id, nombre, email, telefono, pass_hash, activo)
         VALUES ($1, $2, COALESCE($3, CONCAT(replace(lower($2),' ','_'),'_',extract(epoch from now())::text,'@tmp.local')), $4, 'DUMMY', true)
         RETURNING id`,
        [rolId, nombre, email || null, telefono || null]
      );
      const usuarioId = userRes.rows[0].id;

      if (rol.toLowerCase() === "repartidor") {
        await client.query(
          `INSERT INTO public.conductor (usuario_id, licencia, activo)
           VALUES ($1, $2, true)`,
          [usuarioId, licencia ? "SI" : "NO"]
        );
      }

      return { usuarioId };
    });

    return NextResponse.json({ ok: true, usuarioId: result.usuarioId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 400 });
  }
}
