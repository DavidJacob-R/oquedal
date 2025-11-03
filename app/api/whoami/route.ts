export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// --- helpers ---
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function readCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie") || "";
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`, "i").exec(raw);
  if (!m?.[1]) return null;
  const val = decodeURIComponent(m[1]);
  if (!val || val === "undefined" || val === "null") return null;
  return val;
}

function wantAnonUid(headers: Headers): string | null {
  const raw = headers.get("cookie") || "";
  const m = /(?:^|;\s*)uid_local=([^;]+)/i.exec(raw);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

async function getOrCreateClienteParaUsuario(userId: string) {
  // si ya existe cliente ligado al usuario, retornalo
  const q1 = await pool.query(
    `select id, nombre, telefono, email
       from public.cliente
      where usuario_id = $1::uuid
      limit 1`,
    [userId]
  );
  if (q1.rowCount) return q1.rows[0];

  // trae datos del usuario para poblar nombre/email
  const uq = await pool.query(
    `select coalesce(nombre, split_part(email,'@',1)) as nombre,
            email, telefono
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
  // lee cookie de sesion
  const cookieUid = readCookie(req.headers, "usuario_id");
  // si viene header y es "undefined", ignoralo
  const hdrUidRaw = (req.headers.get("x-usuario-id") || "").trim();
  const hdrUid = hdrUidRaw && hdrUidRaw !== "undefined" ? hdrUidRaw : null;

  // 1) usuario autenticado por cookie/header valido
  const userId = isUuid(cookieUid) ? cookieUid : isUuid(hdrUid) ? hdrUid : null;

  if (userId) {
    try {
      const u = await pool.query(
        `select id, email, coalesce(nombre, split_part(email,'@',1)) as nombre, telefono
           from public.auth_local_usuario
          where id = $1::uuid
          limit 1`,
        [userId]
      );

      if (!u.rowCount) {
        // cookie invalida -> limpia y vuelve anon
        const res = NextResponse.json({ ok: true, auth: false });
        res.cookies.set("usuario_id", "", { path: "/", maxAge: 0, sameSite: "lax" });
        // asegura uid_local
        let anon = wantAnonUid(req.headers);
        if (!anon) {
          anon = crypto.randomUUID();
          res.cookies.set("uid_local", anon, {
            path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 30
          });
        }
        return res;
      }

      const user = u.rows[0];
      const cliente = await getOrCreateClienteParaUsuario(userId);

      const res = NextResponse.json({
        ok: true,
        auth: true,
        user,
        cliente,
        displayName: cliente?.nombre || user?.nombre
      });

      // normaliza cookie usuario_id (evita "undefined")
      res.cookies.set("usuario_id", String(userId), {
        path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 7
      });
      return res;
    } catch (e) {
      console.error(e);
      const res = NextResponse.json({ ok: false, auth: false, msg: "error_interno" }, { status: 500 });
      return res;
    }
  }

  // 2) sesion anonima (sin castear a uuid)
  const payload = { ok: true, auth: false } as const;
  const res = NextResponse.json(payload);
  let anon = wantAnonUid(req.headers);
  if (!anon) {
    anon = crypto.randomUUID();
    res.cookies.set("uid_local", anon, {
      path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 30
    });
  }
  // limpia cualquier basura previa
  res.cookies.set("usuario_id", "", { path: "/", maxAge: 0, sameSite: "lax" });
  return res;
}
