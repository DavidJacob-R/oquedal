// lib/roles.ts
import { query } from "./db";
// lib/quota.ts
export const QUOTA_MAX_BLOCK = 8.0;      // tope duro
export const QUOTA_EXTRA_START = 8.3;    // desde aquí marcamos "extra"

// Asegura que exista un rol por nombre y devuelve su id.
export async function ensureRole(nombre: string): Promise<string> {
  // upsert por nombre único
  const res = await query<{ id: string }>(
    `INSERT INTO public.rol (nombre)
     VALUES ($1)
     ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
     RETURNING id`,
    [nombre]
  );
  return res.rows[0].id;
}

// Obtiene id de rol por nombre (o null si no existe)
export async function getRoleId(nombre: string): Promise<string | null> {
  const res = await query<{ id: string }>(
    `SELECT id FROM public.rol WHERE nombre=$1`,
    [nombre]
  );
  return res.rows[0]?.id ?? null;
}
