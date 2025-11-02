export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { pool } from "@/lib/db";

async function hashPassword(plain: string): Promise<string> {
  try {
    const bcrypt = await import("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(plain, salt);
  } catch {
    return plain; // fallback sin hash (segun tu requerimiento simple)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.toString().trim().toLowerCase();
  const password = body?.password?.toString() ?? "";
  const nombre = body?.nombre?.toString().trim() || null;
  const telefono = body?.telefono?.toString().trim() || null;

  if (!email || !password) {
    return NextResponse.json({ ok: false, msg: "datos invalidos" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Evita duplicados en ambas fuentes
    const existsAuth = await client.query(
      `select 1 from public.auth_local_usuario where lower(email) = $1 limit 1`,
      [email]
    );
    if (existsAuth.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, msg: "el correo ya esta registrado" }, { status: 409 });
    }
    const existsAdmin = await client.query(
      `select 1 from public.usuario where lower(email) = $1 limit 1`,
      [email]
    );
    if (existsAdmin.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, msg: "el correo ya esta registrado" }, { status: 409 });
    }

    const password_hash = await hashPassword(password);

    const insUser = await client.query(
      `insert into public.auth_local_usuario (email, password_hash, nombre, telefono)
       values ($1,$2,$3,$4)
       returning id, coalesce(nombre, split_part(email,'@',1)) as nombre`,
      [email, password_hash, nombre, telefono]
    );

    const newId = String(insUser.rows[0].id);
    const displayName = String(insUser.rows[0].nombre || "Cliente");

    await client.query(
      `insert into public.cliente (usuario_id, nombre, telefono, email, activo)
       values ($1, $2, $3, $4, true)`,
      [newId, displayName, telefono, email]
    );

    await client.query("COMMIT");

    const res = NextResponse.json({
      ok: true,
      user: { id: newId, nombre: displayName, rol: "cliente" },
      redirect: "/cliente/pedidos",
    });
    res.cookies.set("usuario_id", newId, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
    res.cookies.set("admin_id", "", { path: "/", maxAge: 0, sameSite: "lax" });
    return res;
  } catch (e: any) {
    try { await client.query("ROLLBACK"); } catch {}
    if (e?.code === "23505") {
      return NextResponse.json({ ok: false, msg: "el correo ya esta registrado" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error interno" }, { status: 500 });
  } finally {
    client.release();
  }
}
