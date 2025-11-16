// lib/estimate.ts

// Coeficientes ajustables (horas)
const BASE_MANIOBRA = 0.50;        // Carga/descarga mínima
const BASE_TRAYECTO = 0.75;        // Traslado base urbano
const BONUS_MUDANZA = 0.25;        // Mudanza suele tardar más
const BONUS_OTRA_CIUDAD = 0.25;    // Origen/Destino en distinta ciudad

const RATE_VOL_M3 = 0.20;          // 0.20 h por m3
const RATE_PESO_KG = 0.0005;       // 0.05 h por cada 100 kg => 0.0005 h/kg

const MIN_HORAS = 0.75;            // No menos de 45 min
const MAX_HORAS = 4.50;            // Cota por pedido para no sobreestimar

export type PedidoForEstimate = {
  tipo: string | null;              // 'mudanza' | 'envio'
  origen_ciudad: string | null;
  destino_ciudad: string | null;
  volumen_m3: number | null;
  peso_kg: number | null;
};

export function estimateHorasForPedido(p: PedidoForEstimate): number {
  const tipo = (p.tipo || "").toLowerCase().trim();
  const vol = Number(p.volumen_m3 || 0);
  const kg = Number(p.peso_kg || 0);

  let h =
    BASE_MANIOBRA +
    BASE_TRAYECTO +
    (tipo === "mudanza" ? BONUS_MUDANZA : 0) +
    (normalize(p.origen_ciudad) !== normalize(p.destino_ciudad) ? BONUS_OTRA_CIUDAD : 0) +
    RATE_VOL_M3 * Math.max(0, vol) +
    RATE_PESO_KG * Math.max(0, kg);

  h = clamp(h, MIN_HORAS, MAX_HORAS);
  return round2(h);
}

function normalize(s: string | null): string {
  return (s || "").toLowerCase().trim();
}
function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}
function round2(x: number) {
  return Math.round(x * 100) / 100;
}
