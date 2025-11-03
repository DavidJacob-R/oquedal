export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }

function readCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie") || "";
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`, "i").exec(raw);
  if (!m?.[1]) return null;
  const val = decodeURIComponent(m[1]);
  if (!val || val === "undefined" || val === "null") return null;
  return val;
}
const readAnonUid = (h: Headers) => readCookie(h, "uid_local");

async function getOrCreateClienteParaUsuario(userId: string) {
  const q1 = await pool.query(
    `select id, nombre, telefono, email
       from public.cliente
      where usuario_id = $1::uuid
      limit 1`,
    [userId]
  );
  if (q1.rowCount) return q1.rows[0];

  const uq = await pool.query(
    `select coalesce(nombre, split_part(email,'@',1)) as nombre, email, telefono
       from public.auth_local_usuario
      where id = $1::uuid
      limit 1`,
    [userId]
  );
  const nombre = uq.rows?.[0]?.nombre || "cliente";
  const email = uq.rows?.[0]?.email || null;
  const telefono = uq.rows?.[0]?.telefono || null;

  const ins = await pool.query(
    `insert into public.cliente (nombre, telefono, email, activo, usuario_id, uid_local)
     values ($1,$2,$3,true,$4,null)
     returning id, nombre, telefono, email`,
    [nombre, telefono, email, userId]
  );
  return ins.rows[0];
}

export async function GET(req: Request) {
  try {
    const userId = readCookie(req.headers, "usuario_id");
    const anon = readAnonUid(req.headers);

    if (isUuid(userId)) {
      // fusionar anonimo → usuario si existe
      if (anon) {
        await pool.query(
          `update public.cliente
              set usuario_id = $1
            where uid_local = $2
              and (usuario_id is null or usuario_id = $1)`,
          [userId, anon]
        );
      }

      const u = await pool.query(
        `select id, email, coalesce(nombre, split_part(email,'@',1)) as nombre, telefono
           from public.auth_local_usuario
          where id = $1::uuid
          limit 1`,
        [userId]
      );
      if (!u.rowCount) {
        const res = NextResponse.json({ ok: true, auth: false });
        res.cookies.set("usuario_id", "", { path: "/", maxAge: 0, sameSite: "lax" });
        return res;
      }

      const user = u.rows[0];
      const cliente = await getOrCreateClienteParaUsuario(userId);

      const res = NextResponse.json({
        ok: true, auth: true, user, cliente,
        displayName: cliente?.nombre || user?.nombre
      });
      res.cookies.set("usuario_id", String(userId), { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    // anonimo
    const res = NextResponse.json({ ok: true, auth: false });
    if (!anon) {
      const gen = crypto.randomUUID();
      res.cookies.set("uid_local", gen, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    }
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, auth: false, msg: "error_interno" }, { status: 500 });
  }
}
