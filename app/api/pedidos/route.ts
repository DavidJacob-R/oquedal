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

async function ensureClienteId(uid: string) {
  if (isUuid(uid)) {
    const q1 = await pool.query(`select id from cliente where usuario_id = $1::uuid limit 1`, [uid]);
    if (q1.rowCount) return q1.rows[0].id as string;
  }
  const q2 = await pool.query(`select id from cliente where uid_local = $1 limit 1`, [uid]);
  if (q2.rowCount) return q2.rows[0].id as string;

  const ins = await pool.query(
    `insert into cliente (nombre, activo, uid_local) values ('cliente', true, $1) returning id`,
    [uid]
  );
  return ins.rows[0].id as string;
}

export async function GET(req: Request) {
  try {
    const uid = getUid(req.headers);
    if (!uid) return NextResponse.json({ error: "uid_requerido" }, { status: 401 });

    const clienteId = await ensureClienteId(uid);
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado") || "pendiente";

    const q = await pool.query(
      `select * from pedido
        where cliente_id = $1 and estado = $2
        order by created_at desc`,
      [clienteId, estado]
    );

    return NextResponse.json(q.rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "error_servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const uid = getUid(req.headers);
    if (!uid) return NextResponse.json({ error: "uid_requerido" }, { status: 401 });

    const clienteId = await ensureClienteId(uid);
    const b = await req.json().catch(() => ({}));

    const required = ["tipo","fecha","origen_direccion","destino_direccion","contacto_nombre","contacto_tel"];
    for (const k of required) {
      if (!b?.[k]) return NextResponse.json({ error: `falta_${k}` }, { status: 400 });
    }

    const {
      tipo, fecha, franja_horaria,
      origen_direccion, origen_ciudad, origen_estado, origen_cp,
      destino_direccion, destino_ciudad, destino_estado, destino_cp,
      contacto_nombre, contacto_tel, descripcion,
      volumen_m3, peso_kg,
      // precio_estimado (se ignora)
      // estado (se fuerza 'pendiente')
    } = b;

    const ins = await pool.query(
      `insert into pedido (
        cliente_id, tipo, fecha, franja_horaria,
        origen_direccion, origen_ciudad, origen_estado, origen_cp,
        destino_direccion, destino_ciudad, destino_estado, destino_cp,
        contacto_nombre, contacto_tel, descripcion,
        volumen_m3, peso_kg, precio_estimado, estado, created_at
      ) values (
        $1,$2,$3,$4,
        $5,$6,$7,$8,
        $9,$10,$11,$12,
        $13,$14,$15,
        $16,$17, NULL, 'pendiente', now()
      )
      returning *`,
      [
        clienteId, tipo, fecha, franja_horaria || null,
        origen_direccion, origen_ciudad || null, origen_estado || null, origen_cp || null,
        destino_direccion, destino_ciudad || null, destino_estado || null, destino_cp || null,
        contacto_nombre, contacto_tel, descripcion || null,
        volumen_m3 ?? null, peso_kg ?? null,
      ]
    );

    return NextResponse.json(ins.rows[0]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "error_servidor" }, { status: 500 });
  }
}
