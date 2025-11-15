export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function getCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie") || "";
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(raw);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const adminId = getCookie(req.headers, "admin_id");
    if (!adminId) return NextResponse.json({ ok: false, msg: "solo_admin" }, { status: 403 });

    const pedidoId = String(params?.id || "");
    if (!UUID_RE.test(pedidoId)) {
      return NextResponse.json({ ok: false, msg: "id_invalido" }, { status: 400 });
    }

    const b = await req.json().catch(() => ({}));
    const repartidorId = String(b?.repartidor_id || "");
    if (!UUID_RE.test(repartidorId)) {
      return NextResponse.json({ ok: false, msg: "repartidor_invalido" }, { status: 400 });
    }

    const qrep = await pool.query(
      `select u.id
         from public.usuario u
         join public.rol r on r.id = u.rol_id
        where u.id = $1::uuid and lower(r.nombre) = 'repartidor'
        limit 1`,
      [repartidorId]
    );
    if (!qrep.rowCount) return NextResponse.json({ ok: false, msg: "no_es_repartidor" }, { status: 400 });

    const up = await pool.query(
      `update public.pedido
          set asignado_a = $2::uuid
        where id = $1::uuid
          and estado = 'confirmado'
          and estado_entrega = 'pendiente'
        returning id`,
      [pedidoId, repartidorId]
    );

    if (!up.rowCount) {
      return NextResponse.json({ ok: false, msg: "pedido_no_disponible" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error_interno" }, { status: 500 });
  }
}
