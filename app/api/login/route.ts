export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { pool } from "@/lib/db";

async function comparePassword(input: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const s = String(stored);
  // Si viene bcrypt, lo usamos; si no, comparamos plano (como pediste)
  if (s.startsWith("$2a$") || s.startsWith("$2b$") || s.startsWith("$2y$")) {
    try {
      const bcrypt = await import("bcryptjs");
      return await bcrypt.compare(input, s);
    } catch {
      return input === s;
    }
  }
  return input === s;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.toString().trim().toLowerCase();
  const password = body?.password?.toString() ?? "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, msg: "datos invalidos" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // 1) admin en public.usuario
    const qa = await client.query(
      `select u.id, u.nombre, u.pass_hash, r.nombre as rol, u.activo
         from public.usuario u
         join public.rol r on r.id = u.rol_id
        where lower(u.email) = $1
        limit 1`,
      [email]
    );

    if (qa.rowCount) {
      const row = qa.rows[0];
      const okPass = await comparePassword(password, row.pass_hash);
      if (okPass && (row.activo ?? true)) {
        const res = NextResponse.json({
          ok: true,
          user: { id: row.id as string, nombre: (row.nombre as string) || "Administrador", rol: "admin" },
          redirect: "/admin/panel",
        });
        res.cookies.set("admin_id", String(row.id), { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
        res.cookies.set("usuario_id", "", { path: "/", maxAge: 0, sameSite: "lax" });
        return res;
      }
    }

    // 2) cliente en auth_local_usuario (y nombre desde cliente si existe)
    const qc = await client.query(
      `select a.id, a.password_hash, coalesce(c.nombre, a.nombre) as nombre
         from public.auth_local_usuario a
         left join public.cliente c on c.usuario_id = a.id
        where lower(a.email) = $1
        limit 1`,
      [email]
    );

    if (qc.rowCount) {
      const row = qc.rows[0];
      const okPass = await comparePassword(password, row.password_hash);
      if (okPass) {
        const res = NextResponse.json({
          ok: true,
          user: { id: row.id as string, nombre: (row.nombre as string) || "Cliente", rol: "cliente" },
          redirect: "/cliente/pedidos",
        });
        res.cookies.set("usuario_id", String(row.id), { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
        res.cookies.set("admin_id", "", { path: "/", maxAge: 0, sameSite: "lax" });
        return res;
      }
    }

    return NextResponse.json({ ok: false, msg: "credenciales invalidas" }, { status: 401 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error interno" }, { status: 500 });
  } finally {
    client.release();
  }
}
