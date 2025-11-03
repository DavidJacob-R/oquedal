export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function readAnonUid(headers: Headers): string | null {
  const raw = headers.get("cookie") || "";
  const m = /(?:^|;\s*)uid_local=([^;]+)/i.exec(raw);
  if (!m?.[1]) return null;
  const v = decodeURIComponent(m[1]);
  if (!v || v === "undefined" || v === "null") return null;
  return v;
}

async function hashPassword(plain: string): Promise<string> {
  try {
    const bcrypt = await import("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(plain, salt);
  } catch {
    return plain;
  }
}

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const body = await req.json().catch(() => ({}));
    const nombre = (body?.nombre ?? "").trim();
    const email = (body?.email ?? "").trim().toLowerCase();
    const telefono = (body?.telefono ?? "").trim() || null;
    const password = String(body?.password ?? "");
    if (!email || !password) {
      return NextResponse.json({ ok: false, msg: "faltan_datos" }, { status: 400 });
    }

    await client.query("BEGIN");

    const exists = await client.query(
      `select 1 from public.auth_local_usuario where email = $1 limit 1`,
      [email]
    );
    if (exists.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, msg: "el correo ya esta registrado" }, { status: 409 });
    }

    const password_hash = await hashPassword(password);

    const insUser = await client.query(
      `insert into public.auth_local_usuario (email, password_hash, nombre, telefono)
       values ($1,$2,$3,$4)
       returning id, coalesce(nombre, split_part(email,'@',1)) as nombre`,
      [email, password_hash, nombre || null, telefono]
    );
    const newUserId: string = insUser.rows[0].id;
    const nombreFinal: string = insUser.rows[0].nombre;

    // FUSIONAR con cliente anonimo si existe cookie uid_local
    const anon = readAnonUid(req.headers);
    let clienteId: string | null = null;

    if (anon) {
      const upd = await client.query(
        `update public.cliente
            set usuario_id = $1,
                nombre = coalesce($2, nombre),
                telefono = coalesce($3, telefono),
                email = coalesce($4, email)
          where uid_local = $5
            and (usuario_id is null or usuario_id = $1)
          returning id`,
        [newUserId, nombre || null, telefono, email, anon]
      );
      if (upd.rowCount) clienteId = upd.rows[0].id;
    }

    if (!clienteId) {
      const q = await client.query(
        `select id from public.cliente where usuario_id = $1 limit 1`,
        [newUserId]
      );
      if (q.rowCount) {
        clienteId = q.rows[0].id;
      } else {
        const insCli = await client.query(
          `insert into public.cliente (nombre, telefono, email, activo, usuario_id, uid_local)
           values ($1,$2,$3,true,$4,null)
           returning id`,
          [nombre || nombreFinal, telefono, email, newUserId]
        );
        clienteId = insCli.rows[0].id;
      }
    }

    await client.query("COMMIT");

    const res = NextResponse.json({ ok: true, user_id: newUserId, cliente_id: clienteId });
    // setea sesion
    res.cookies.set("usuario_id", newUserId, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
    // conserva uid_local por si el cliente vuelve a salir (no lo borres)
    return res;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error_interno" }, { status: 500 });
  } finally {
    client.release();
  }
}
