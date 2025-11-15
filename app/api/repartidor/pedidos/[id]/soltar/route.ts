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
    const repId = getCookie(req.headers, "repartidor_id");
    if (!repId) return NextResponse.json({ ok: false, msg: "solo_repartidor" }, { status: 403 });

    const id = String(params?.id || "");
    if (!UUID_RE.test(id)) return NextResponse.json({ ok: false, msg: "id_invalido" }, { status: 400 });

    const up = await pool.query(
      `update public.pedido
          set asignado_a = null
        where id = $1::uuid
          and estado = 'confirmado'
          and estado_entrega = 'pendiente'
          and asignado_a = $2::uuid
        returning id`,
      [id, repId]
    );

    if (up.rowCount === 1) return NextResponse.json({ ok: true });

    return NextResponse.json({ ok: false, msg: "no_asignado_a_ti" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error_interno" }, { status: 500 });
  }
}
