// lib/db.ts
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

let _pool: Pool | null = null;

function makePool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no definida");
  return new Pool({
    connectionString,
    ssl:
      process.env.PGSSL?.toLowerCase() === "true" ||
      connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : false,
    max: Number(process.env.PGPOOL_MAX || 10),
    idleTimeoutMillis: 30_000,
  });
}

export function getPool(): Pool {
  if (!_pool) _pool = makePool();
  return _pool;
}

/** API nueva recomendada */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function tx<T = any>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/** COMPATIBILIDAD con código existente que usa `pool.query(...)` */
export const pool = getPool();
