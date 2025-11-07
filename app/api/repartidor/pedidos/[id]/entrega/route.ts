export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function readCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie") || "";
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`, "i").exec(raw);
  if (!m?.[1]) return null;
  const v = decodeURIComponent(m[1]);
  if (!v || v === "undefined" || v === "null") return null;
  return v;
}
function getUid(req: Request): string | null {
  return readCookie(req.headers, "usuario_id") || (req.headers.get("x-usuario-id") || "").trim() || null;
}
function getRol(req: Request): string {
  return readCookie(req.headers, "rol") || "";
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const uid = getUid(req);
    const rol = getRol(req);
    if (!uid) return NextResponse.json({ ok:false, msg:"no_autorizado" }, { status: 401 });
    if (rol !== "repartidor") return NextResponse.json({ ok:false, msg:"solo_repartidor" }, { status: 403 });

    const id = String(params?.id || "");
    if (!UUID_RE.test(id)) return NextResponse.json({ ok:false, msg:"id_invalido" }, { status: 400 });

    const b = await req.json().catch(() => ({}));
    const estado = String(b?.estado || "").toLowerCase();
    if (estado !== "completo" && estado !== "incompleto") {
      return NextResponse.json({ ok:false, msg:"estado_invalido" }, { status: 400 });
    }
    const motivo = b?.motivo ? String(b?.motivo).slice(0,200) : null;
    const nota = b?.nota ? String(b?.nota).slice(0,500) : null;

    // Verificar que el pedido esta aceptado y pendiente de entrega
    const q0 = await pool.query(
      `select 1
         from public.pedido p
        where p.id = $1::uuid
          and lower(coalesce(p.estado, p.accion, 'pendiente')) in ('confirmado','aceptado','aprobado')
          and p.estado_entrega = 'pendiente'
        limit 1`,
      [id]
    );
    if (!q0.rowCount) return NextResponse.json({ ok:false, msg:"pedido_no_pendiente" }, { status: 400 });

    // Insert en historial + trigger actualiza pedido.estado_entrega
    const ins = await pool.query(
      `insert into public.pedido_entrega (pedido_id, repartidor_uid, estado, motivo, nota)
       values ($1::uuid, $2::uuid, $3, $4, $5)
       returning id`,
      [id, UUID_RE.test(uid) ? uid : null, estado, motivo, nota]
    );

    return NextResponse.json({ ok:true, entrega_id: ins.rows[0].id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok:false, msg:"error_interno" }, { status: 500 });
  }
}
