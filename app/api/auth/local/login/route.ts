// app/api/auth/local/login/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, cookieOpts } from "@/lib/auth";

type Body = { email: string; password: string };

export const dynamic = "force-dynamic";

function normalizeRole(raw: string | null | undefined): "admin" | "repartidor" | "cliente" | "other" {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return "other";
  if (s.includes("admin")) return "admin";                 // admin, administrador, superadmin...
  if (s.includes("repartidor") || s.includes("conductor")) return "repartidor"; // conductor ≡ repartidor
  if (s.includes("cliente")) return "cliente";
  return s as any;
}

function clearAll(res: NextResponse) {
  const base = cookieOpts();
  const dead = { ...base, maxAge: 0, expires: new Date(0) };
  for (const k of ["admin_id", "usuario_id", "repartidor_id", "auth_token", "oquedal_token"]) {
    res.cookies.set(k, "", dead);
  }
}

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as Body;
    const em = (email || "").trim();
    const pw = (password || "").trim();
    if (!em || !pw) return NextResponse.json({ ok: false, error: "Email y password requeridos" }, { status: 400 });

    // 1) Buscar en USUARIO (roles del sistema)
    const ures = await query(
      `SELECT u.id, u.pass_hash, u.activo, LOWER(r.nombre) AS rol, u.nombre
       FROM public.usuario u
       JOIN public.rol r ON r.id = u.rol_id
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [em]
    );

    if ((ures.rows?.length ?? 0) > 0) {
      const u = ures.rows[0] as { id: string; pass_hash: string; activo: boolean; rol: string; nombre: string | null };
      if (!u.activo) return NextResponse.json({ ok: false, error: "Usuario inactivo" }, { status: 403 });

      const okPass = await verifyPassword(pw, u.pass_hash);
      if (!okPass) return NextResponse.json({ ok: false, error: "Credenciales inválidas" }, { status: 401 });

      const norm = normalizeRole(u.rol);

      // Si es repartidor, exigir registro activo en CONDUCTOR
      if (norm === "repartidor") {
        const c = await query(`SELECT 1 FROM public.conductor WHERE usuario_id = $1 AND activo = true LIMIT 1`, [u.id]);
        if ((c.rows?.length ?? 0) === 0) {
          return NextResponse.json({ ok: false, error: "Repartidor sin registro/activo en 'conductor'" }, { status: 403 });
        }
      }

      const res = NextResponse.json({ ok: true, user: { id: u.id, rol: norm, nombre: u.nombre ?? null } });

      // Limpiar TODO y poner cookie del rol correcto
      clearAll(res);
      if (norm === "admin") {
        res.cookies.set("admin_id", u.id, cookieOpts());
      } else if (norm === "repartidor") {
        res.cookies.set("repartidor_id", u.id, cookieOpts());
      } else if (norm === "cliente") {
        // (poco común que esté en usuario con rol cliente; igual soportado)
        res.cookies.set("usuario_id", u.id, cookieOpts());
      } else {
        // otros roles internos -> token neutral (no protegido por tu middleware)
        res.cookies.set("oquedal_token", `u:${u.id}:${u.rol}`, cookieOpts());
      }

      return res;
    }

    // 2) Si NO existe en usuario, intentar login de CLIENTE (auth_local_usuario)
    const cres = await query(
      `SELECT id, password_hash, nombre FROM public.auth_local_usuario WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [em]
    );
    if ((cres.rows?.length ?? 0) > 0) {
      const c = cres.rows[0] as { id: string; password_hash: string; nombre: string | null };
      const ok = await verifyPassword(pw, c.password_hash);
      if (!ok) return NextResponse.json({ ok: false, error: "Credenciales inválidas" }, { status: 401 });

      const res = NextResponse.json({ ok: true, user: { id: c.id, rol: "cliente", nombre: c.nombre ?? null } });
      clearAll(res);
      res.cookies.set("usuario_id", c.id, cookieOpts());
      return res;
    }

    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
