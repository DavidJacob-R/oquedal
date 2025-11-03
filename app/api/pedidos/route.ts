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
const readAnonUid = (h: Headers) => readCookie(h, "uid_local");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value as string);
}

async function ensureClienteId(uid: string) {
  if (isUuid(uid)) {
    const q1 = await pool.query(
      `select id from public.cliente where usuario_id = $1::uuid limit 1`,
      [uid]
    );
    if (q1.rowCount) return q1.rows[0].id as string;

    const uq = await pool.query(
      `select coalesce(nombre, split_part(email,'@',1)) as nombre,
              email, telefono
         from public.auth_local_usuario
        where id = $1::uuid
        limit 1`,
      [uid]
    );
    const nombre = uq.rows?.[0]?.nombre || "cliente";
    const email = uq.rows?.[0]?.email || null;
    const telefono = uq.rows?.[0]?.telefono || null;

    const ins = await pool.query(
      `insert into public.cliente (nombre, telefono, email, activo, usuario_id, uid_local)
       values ($1,$2,$3,true,$4,null)
       returning id`,
      [nombre, telefono, email, uid]
    );
    return ins.rows[0].id as string;
  }

  const q2 = await pool.query(
    `select id from public.cliente where uid_local = $1 limit 1`,
    [uid]
  );
  if (q2.rowCount) return q2.rows[0].id as string;

  const ins2 = await pool.query(
    `insert into public.cliente (nombre, activo, uid_local)
     values ('invitado', true, $1)
     returning id`,
    [uid]
  );
  return ins2.rows[0].id as string;
}

export async function GET(req: Request) {
  try {
    const uid = getUid(req);
    if (!uid) return NextResponse.json({ ok: false, msg: "no_autorizado" }, { status: 401 });

    if (isUuid(uid)) {
      const anon = readAnonUid(req.headers);
      if (anon) {
        await pool.query(
          `update public.cliente
              set usuario_id = $1
            where uid_local = $2
              and (usuario_id is null or usuario_id = $1)`,
          [uid, anon]
        );
      }
    }

    const rawEstado = `
      coalesce(
        (to_jsonb(p)->>'estado'),
        (to_jsonb(p)->>'estatus'),
        (to_jsonb(p)->>'status'),
        (to_jsonb(p)->>'estado_pedido'),
        (to_jsonb(p)->>'accion'),
        'pendiente'
      )
    `;

    const estadoSQL = `
      case
        when lower(trim(${rawEstado})) in
          ('aceptado','aprobado','accept','accepted','approve','approved','ok','confirmado','confirmar','aceptar','acepto')
          then 'aceptado'
        when lower(trim(${rawEstado})) in
          ('rechazado','denegado','reject','rejected','rechazar','rechazo','cancelado','cancelled','cancelado_por_admin')
          then 'rechazado'
        else 'pendiente'
      end as estado
    `;

    const selectBase = `
      select
        p.id, p.cliente_id, p.tipo, p.fecha, p.franja_horaria,
        p.origen_direccion, p.origen_ciudad, p.origen_estado, p.origen_cp,
        p.destino_direccion, p.destino_ciudad, p.destino_estado, p.destino_cp,
        p.contacto_nombre, p.contacto_tel, p.descripcion,
        ${estadoSQL}
      from public.pedido p
      join public.cliente c on c.id = p.cliente_id
    `;

    if (isUuid(uid)) {
      const r = await pool.query(
        `${selectBase}
         where c.usuario_id = $1
         order by p.fecha desc nulls last, p.id desc`,
        [uid]
      );
      return NextResponse.json({ ok: true, rows: r.rows });
    } else {
      const r = await pool.query(
        `${selectBase}
         where c.uid_local = $1
         order by p.fecha desc nulls last, p.id desc`,
        [uid]
      );
      return NextResponse.json({ ok: true, rows: r.rows });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error_interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const uid = getUid(req);
    if (!uid) return NextResponse.json({ ok: false, msg: "no_autorizado" }, { status: 401 });
    const b = await req.json().catch(() => ({}));
    const cliente_id = await ensureClienteId(uid);

    const tipo = (b?.tipo ?? "").trim();
    const fecha = (b?.fecha ?? "").trim();
    const franja_horaria = (b?.franja_horaria ?? null) as string | null;
    const origen_direccion = (b?.origen_direccion ?? "").trim();
    const origen_ciudad = (b?.origen_ciudad ?? null) as string | null;
    const origen_estado = (b?.origen_estado ?? null) as string | null;
    const origen_cp = (b?.origen_cp ?? null) as string | null;
    const destino_direccion = (b?.destino_direccion ?? "").trim();
    const destino_ciudad = (b?.destino_ciudad ?? null) as string | null;
    const destino_estado = (b?.destino_estado ?? null) as string | null;
    const destino_cp = (b?.destino_cp ?? null) as string | null;
    const contacto_nombre = (b?.contacto_nombre ?? "").trim();
    const contacto_tel = (b?.contacto_tel ?? "").trim();
    const descripcion = (b?.descripcion ?? null) as string | null;

    if (!tipo || !fecha || !origen_direccion || !destino_direccion || !contacto_nombre || !contacto_tel) {
      return NextResponse.json({ ok: false, msg: "faltan_datos" }, { status: 400 });
    }

    await client.query("BEGIN");
    const ins = await client.query(
      `insert into public.pedido
       (cliente_id, tipo, fecha, franja_horaria,
        origen_direccion, origen_ciudad, origen_estado, origen_cp,
        destino_direccion, destino_ciudad, destino_estado, destino_cp,
        contacto_nombre, contacto_tel, descripcion)
       values
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       returning *`,
      [
        cliente_id, tipo, fecha, franja_horaria,
        origen_direccion, origen_ciudad, origen_estado, origen_cp,
        destino_direccion, destino_ciudad, destino_estado, destino_cp,
        contacto_nombre, contacto_tel, descripcion
      ]
    );
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, row: ins.rows[0] });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error(e);
    return NextResponse.json({ ok: false, msg: "error_interno" }, { status: 500 });
  } finally {
    client.release();
  }
}
