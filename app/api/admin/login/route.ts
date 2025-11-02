export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "faltan_campos" }, { status: 400 });
    }

    const q = await pool.query(
      `select u.id, u.pass_hash, u.activo
         from usuario u
         join rol r on r.id = u.rol_id
        where lower(u.email) = lower($1)
          and r.nombre = 'admin'
        limit 1`,
      [email]
    );

    if (!q.rowCount) return NextResponse.json({ ok: false, error: "credenciales_invalidas" }, { status: 401 });

    const u = q.rows[0];
    if (!u.activo) return NextResponse.json({ ok: false, error: "usuario_inactivo" }, { status: 403 });

    const ok = await bcrypt.compare(String(password), u.pass_hash || "");
    if (!ok) return NextResponse.json({ ok: false, error: "credenciales_invalidas" }, { status: 401 });

    const res = NextResponse.json({ ok: true, admin_id: u.id });
    // set admin cookie (1 año)
    res.cookies.set({
      name: "admin_id",
      value: String(u.id),
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    // borra cookie de cliente
    res.cookies.delete("usuario_id");
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "error_servidor" }, { status: 500 });
  }
}
