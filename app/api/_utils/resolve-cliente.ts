import { pool } from "@/lib/db";

/**
 * Resuelve el id (uuid) de la tabla cliente a partir de:
 * 1) usuario_id = uid (si es uuid valido)
 * 2) uid_local = uid (texto)
 * Si no existe, crea un cliente básico con uid_local = uid.
 */
export async function resolveClienteId(uid: string) {
  const u = (uid || "").trim();
  if (!u) throw new Error("uid requerido");

  // a) si uid es uuid: intenta por usuario_id
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(u);
  if (isUuid) {
    const q = await pool.query(`select id from cliente where usuario_id = $1`, [u]);
    if (q.rowCount && q.rows[0]?.id) return q.rows[0].id as string;
  }

  // b) intenta por uid_local
  {
    const q = await pool.query(`select id from cliente where uid_local = $1`, [u]);
    if (q.rowCount && q.rows[0]?.id) return q.rows[0].id as string;
  }

  // c) crear cliente basico
  const ins = await pool.query(
    `insert into cliente (nombre, activo, uid_local) values ($1, true, $2) returning id`,
    ["cliente", u]
  );
  return ins.rows[0].id as string;
}
