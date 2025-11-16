// lib/eta.ts
// Estimador simple de horas por pedido sin APIs externas.
// Ajusta pesos si lo deseas.
export function estimateHoursForPedido(p: {
  origen_ciudad?: string | null;
  destino_ciudad?: string | null;
  volumen_m3?: number | null;
  peso_kg?: number | null;
  tipo?: string | null;
}) {
  const sameCity =
    (p.origen_ciudad || "").trim().toLowerCase() ===
    (p.destino_ciudad || "").trim().toLowerCase();

  let base = sameCity ? 1.2 : 2.4; // horas base
  const vol = Number(p.volumen_m3 ?? 0);
  const peso = Number(p.peso_kg ?? 0);

  base += Math.min(1.2, vol * 0.15);          // +0.15h por m3 (tope +1.2h)
  base += Math.min(0.8, (peso / 100) * 0.1);  // +0.1h por cada 100kg (tope +0.8h)

  if ((p.tipo || "envio") === "mudanza") base += 0.4;

  return Math.max(0.25, Math.round(base * 100) / 100);
}
