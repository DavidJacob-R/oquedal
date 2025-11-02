export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";

/**
 * Devuelve el usuario actual a partir de cookies:
 * - Si hay admin_id: busca en public.usuario (rol admin).
 * - Si hay usuario_id: intenta public.usuario; si no, cliente.nombre o auth_local_usuario.nombre/email.
 * Respuesta:
 *   { ok: true, user: null }  // no autenticado
 *   { ok: true, user: { id, nombre, rol: "admin" | "cliente" } }
 */
export async function GET() {
  const c = cookies();
  const adminId = c.get("admin_id")?.value || null;
  const userId = c.get("usuario_id")?.value || null;

  const client = await pool.connect();
  try {
    if (adminId) {
      const qa = await client.query(
        `select u.nombre as nombre
           from public.usuario u
           join public.rol r on r.id = u.rol_id
          where u.id = $1
          limit 1`,
        [adminId]
      );
      const nombre = qa.rowCount ? (qa.rows[0].nombre || "Administrador") : "Administrador";
      return NextResponse.json({ ok: true, user: { id: adminId, nombre, rol: "admin" as const } });
    }

    if (userId) {
      // 1) intenta en public.usuario
      const q1 = await client.query(
        `select u.nombre as nombre, coalesce(r.nombre, 'cliente') as rol
           from public.usuario u
           left join public.rol r on r.id = u.rol_id
          where u.id = $1
          limit 1`,
        [userId]
      );
      if (q1.rowCount) {
        const rolNombre: string = (q1.rows[0].rol || "cliente").toString().toLowerCase();
        const isAdmin = rolNombre.includes("admin");
        const nombre = q1.rows[0].nombre || (isAdmin ? "Administrador" : "Cliente");
        return NextResponse.json({ ok: true, user: { id: userId, nombre, rol: isAdmin ? "admin" : "cliente" } });
      }

      // 2) cliente.nombre (cuando usuario_id apunta a auth_local_usuario)
      const q2 = await client.query(
        `select nombre from public.cliente where usuario_id = $1 limit 1`,
        [userId]
      );
      if (q2.rowCount) {
        const nombre = q2.rows[0].nombre || "Cliente";
        return NextResponse.json({ ok: true, user: { id: userId, nombre, rol: "cliente" as const } });
      }

      // 3) auth_local_usuario como último recurso (usa nombre o el alias del email)
      const q3 = await client.query(
        `select nombre, email from public.auth_local_usuario where id = $1 limit 1`,
        [userId]
      );
      if (q3.rowCount) {
        const nombre = q3.rows[0].nombre || (q3.rows[0].email ? String(q3.rows[0].email).split("@")[0] : "Cliente");
        return NextResponse.json({ ok: true, user: { id: userId, nombre, rol: "cliente" as const } });
      }

      return NextResponse.json({ ok: true, user: { id: userId, nombre: "Cliente", rol: "cliente" as const } });
    }

    return NextResponse.json({ ok: true, user: null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, user: null });
  } finally {
    client.release();
  }
}
