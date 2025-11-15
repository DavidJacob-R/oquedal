export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function getCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie") || "";
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(raw);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export async function GET(req: Request) {
  try {
    const adminId = getCookie(req.headers, "admin_id");
    if (!adminId) return NextResponse.json({ ok: false, msg: "solo_admin" }, { status: 403 });

    const q = await pool.query(
      `
      select u.id::text as id, u.nombre, u.email
      from public.usuario u
      join public.rol r on r.id = u.rol_id
      where lower(r.nombre) = 'repartidor'
      order by u.nombre asc nulls last, u.email asc
      `
    );

    return NextResponse.json({ ok: true, rows: q.rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error_interno" }, { status: 500 });
  }
}
