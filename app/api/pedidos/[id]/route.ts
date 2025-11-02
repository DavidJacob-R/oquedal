export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function getUid(headers: Headers): string | null {
  const h = headers.get("x-usuario-id");
  if (h && h.trim()) return h.trim();
  const cookie = headers.get("cookie") || "";
  const m = /(?:^|;\s*)usuario_id=([^;]+)/i.exec(cookie);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}
function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const uid = getUid(req.headers);
    if (!uid) return NextResponse.json({ error: "uid_requerido" }, { status: 401 });
    const pid = params.id;
    if (!pid) return NextResponse.json({ error: "falta_id" }, { status: 400 });

    // Verifica propiedad + pendiente
    let q0;
    if (isUuid(uid)) {
      q0 = await pool.query(
        `select p.id
           from pedido p
           join cliente c on c.id = p.cliente_id
          where p.id = $1
            and p.estado = 'pendiente'
            and (c.usuario_id = $2::uuid or c.uid_local = $3)
          limit 1`,
        [pid, uid, uid]
      );
    } else {
      q0 = await pool.query(
        `select p.id
           from pedido p
           join cliente c on c.id = p.cliente_id
          where p.id = $1
            and p.estado = 'pendiente'
            and c.uid_local = $2
          limit 1`,
        [pid, uid]
      );
    }
    if (!q0.rowCount) return NextResponse.json({ error: "no_permitido" }, { status: 403 });

    const b = await req.json().catch(() => ({}));
    const updatable = [
      "tipo","fecha","franja_horaria",
      "origen_direccion","origen_ciudad","origen_estado","origen_cp",
      "destino_direccion","destino_ciudad","destino_estado","destino_cp",
      "contacto_nombre","contacto_tel","descripcion",
      "volumen_m3","peso_kg"
    ];

    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    for (const k of updatable) {
      if (Object.prototype.hasOwnProperty.call(b, k)) {
        sets.push(`${k} = $${i++}`);
        vals.push(b[k] === "" ? null : b[k]);
      }
    }
    if (!sets.length) return NextResponse.json({ error: "sin_cambios" }, { status: 400 });

    vals.push(pid);
    const q = await pool.query(
      `update pedido set ${sets.join(", ")} where id = $${i} returning *`,
      vals
    );
    return NextResponse.json(q.rows[0]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "error_servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const pid = params.id;
    if (!pid) return NextResponse.json({ error: "falta_id" }, { status: 400 });

    const q = await pool.query(
      `delete from pedido where id = $1 and estado = 'pendiente'`,
      [pid]
    );
    if (!q.rowCount) return NextResponse.json({ error: "no_encontrado_o_no_permitido" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "error_servidor" }, { status: 500 });
  }
}
