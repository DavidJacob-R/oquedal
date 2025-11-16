export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { LatLng, nearestNeighborOrder, twoOpt, legsMinutesFromOrder } from "@/lib/geo";

export const dynamic = "force-dynamic";

type OutStop = { id: string; label: string; address: string; lat: number | null; lng: number | null };

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokens(s: string) {
  const arr = norm(s).split(" ").filter(Boolean);
  return new Set(arr);
}
/** Jaccard simple entre tokens de pedido y dirección */
function tokenScore(aTxt: string, bTxt: string) {
  const A = tokens(aTxt);
  const B = tokens(bTxt);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((t) => { if (B.has(t)) inter++; });
  const union = new Set([...A, ...B]).size;
  return inter / Math.max(union, 1);
}

/** Construye texto de dirección desde registro direccion */
function dirToString(d: any) {
  const parts = [d.calle, d.numero_ext, d.colonia, d.ciudad, d.estado, d.cp].filter(Boolean);
  return parts.join(" ");
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const repUserId = cookies().get("repartidor_id")?.value || null;
  if (!repUserId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const rutaId = params.id;
  const SPEED_KMH = Number(process.env.OQUEDAL_CITY_KMH || 28);
  const SERVICE_MIN = Number(process.env.OQUEDAL_SERVICE_MIN || 8);

  try {
    // Validar que la ruta sea del repartidor
    const own = await query(
      `SELECT r.id, r.conductor_id
       FROM public.ruta r
       JOIN public.conductor c ON c.id = r.conductor_id
       WHERE r.id = $1 AND c.usuario_id = $2
       LIMIT 1`,
      [rutaId, repUserId]
    );
    if ((own.rows?.length ?? 0) === 0) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const conductorId = own.rows[0].conductor_id as string;

    // Paradas de la ruta con datos del pedido/cliente
    const pres = await query(
      `SELECT pr.id AS parada_id, pr.secuencia,
              p.id AS pedido_id, p.folio,
              p.destino_cp, p.destino_direccion, p.origen_direccion,
              c.id AS cliente_id, c.nombre AS cliente
       FROM public.parada_ruta pr
       JOIN public.pedido p  ON p.id = pr.pedido_id
       JOIN public.cliente c ON c.id = p.cliente_id
       WHERE pr.ruta_id = $1
       ORDER BY pr.secuencia ASC`,
      [rutaId]
    );

    const plan = (pres.rows || []).map((r: any) => ({
      paradaId: String(r.parada_id),
      label: `Folio #${Number(r.folio)} • ${String(r.cliente)}`,
      clienteId: String(r.cliente_id),
      destCp: r.destino_cp ? String(r.destino_cp) : null,
      address: String(r.destino_direccion || r.origen_direccion || "").trim(),
    }));

    if (plan.length === 0) {
      return NextResponse.json({ ok: true, origin: null, optimized: [] as OutStop[], legsMinutes: [] as number[], totalMinutes: 0, note: "Sin paradas" });
    }

    // Origen: último GPS -> base -> null
    let origin: LatLng | null = null;
    const gps = await query(
      `SELECT lat, lng
       FROM public.gps_posicion
       WHERE ruta_id = $1 AND conductor_id = $2
       ORDER BY registrado_en DESC
       LIMIT 1`,
      [rutaId, conductorId]
    );
    if (gps.rows?.length) origin = { lat: Number(gps.rows[0].lat), lng: Number(gps.rows[0].lng) };
    if (!origin && process.env.OQUEDAL_BASE_LAT && process.env.OQUEDAL_BASE_LNG) {
      origin = { lat: Number(process.env.OQUEDAL_BASE_LAT), lng: Number(process.env.OQUEDAL_BASE_LNG) };
    }

    // Para cada parada, escoger coordenadas SOLO si la dirección coincide realmente.
    // Preferimos CP igual; si no hay CP, exigimos score mayor.
    const withCoords: { paradaId: string; label: string; coord: LatLng; address: string }[] = [];
    const noCoords: { paradaId: string; label: string; address: string; why: string }[] = [];

    for (const p of plan) {
      const pedidoAddr = p.address;
      if (!pedidoAddr) {
        noCoords.push({ paradaId: p.paradaId, label: p.label, address: "—", why: "sin_direccion" });
        continue;
      }

      // Candidatos del mismo cliente con lat/lng
      const cand = await query(
        `SELECT id, calle, numero_ext, colonia, ciudad, estado, cp, lat, lng
         FROM public.direccion
         WHERE cliente_id = $1
           AND lat IS NOT NULL AND lng IS NOT NULL
         ORDER BY id DESC
         LIMIT 25`,
        [p.clienteId]
      );

      if (!(cand.rows?.length)) {
        noCoords.push({ paradaId: p.paradaId, label: p.label, address: pedidoAddr, why: "cliente_sin_coords" });
        continue;
      }

      // Evaluar similitud por tokens
      let best: { lat: number; lng: number; score: number; cpEq: boolean } | null = null;

      for (const d of cand.rows) {
        const text = dirToString(d);
        const sc = tokenScore(pedidoAddr, text);
        const cpEq = p.destCp && d.cp ? String(p.destCp) === String(d.cp) : false;

        // Reglas de aceptación:
        // - Si CP coincide: aceptar desde score >= 0.25
        // - Si no coincide CP (o uno vacío): exigir score >= 0.45
        const pass = cpEq ? sc >= 0.25 : sc >= 0.45;
        if (!pass) continue;

        if (!best || sc > best.score || (sc === best.score && cpEq && !best.cpEq)) {
          best = { lat: Number(d.lat), lng: Number(d.lng), score: sc, cpEq };
        }
      }

      if (!best) {
        // No “adivinamos” coordenadas si no hay match decente
        noCoords.push({ paradaId: p.paradaId, label: p.label, address: pedidoAddr, why: "sin_match" });
      } else {
        withCoords.push({
          paradaId: p.paradaId,
          label: p.label,
          coord: { lat: best.lat, lng: best.lng },
          address: pedidoAddr,
        });
      }
    }

    // Si no hay coords fiables, devolvemos plan sólo con direcciones
    if (withCoords.length === 0) {
      const tail: OutStop[] = plan.map((o) => ({ id: o.paradaId, label: o.label, address: o.address || "—", lat: null, lng: null }));
      return NextResponse.json({
        ok: true,
        origin,
        optimized: tail,
        legsMinutes: [],
        totalMinutes: null,
        note: "Sin coincidencias de coordenadas; usando direcciones sin optimizar.",
      });
    }

    // Optimización de orden solo con los que SÍ tienen coords
    let legsMinutes: number[] = [];
    let totalMinutes = 0;
    let ordered = withCoords;

    if (withCoords.length > 1) {
      const points = withCoords.map((w) => w.coord);
      const nn = nearestNeighborOrder(origin ?? points[0], points);
      const best = twoOpt(origin ?? points[0], points, nn);
      const calc = legsMinutesFromOrder(origin ?? points[0], points, best, SPEED_KMH, SERVICE_MIN);
      legsMinutes = calc.legs;
      totalMinutes = calc.total;
      ordered = best.map((i) => withCoords[i]);
    } else if (withCoords.length === 1) {
      legsMinutes = [0];
      totalMinutes = SERVICE_MIN;
    }

    const optimized: OutStop[] = ordered.map((o) => ({ id: o.paradaId, label: o.label, address: o.address, lat: o.coord.lat, lng: o.coord.lng }));
    const tail: OutStop[] = noCoords.map((n) => ({ id: n.paradaId, label: n.label, address: n.address || "—", lat: null, lng: null }));

    // En la lista final, primero los optimizados (con coords), luego los sin coords (sin “inventar” nada)
    const all: OutStop[] = optimized.concat(tail);

    const note =
      noCoords.length > 0
        ? `Optimizado con coordenadas seguras. ${noCoords.length} parada(s) sin match de coordenadas: se agregaron al final con dirección en texto.`
        : "Optimizado localmente con coordenadas seguras.";

    return NextResponse.json({
      ok: true,
      origin,
      optimized: all,
      legsMinutes,
      totalMinutes,
      speedKmh: SPEED_KMH,
      serviceMin: SERVICE_MIN,
      note,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
