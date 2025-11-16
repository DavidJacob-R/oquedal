// lib/geo.ts
export type LatLng = { lat: number; lng: number };

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export function nearestNeighborOrder(origin: LatLng, points: LatLng[]): number[] {
  const n = points.length;
  const used = new Array(n).fill(false);
  const order: number[] = [];
  let cur = origin;
  for (let step = 0; step < n; step++) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < n; i++) if (!used[i]) {
      const d = haversineKm(cur, points[i]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    order.push(bestIdx);
    used[bestIdx] = true;
    cur = points[bestIdx];
  }
  return order;
}

export function twoOpt(origin: LatLng, points: LatLng[], order: number[]): number[] {
  const path = order.slice();
  let improved = true;

  function dist(ord: number[]) {
    let d = 0, cur = origin;
    for (const idx of ord) { d += haversineKm(cur, points[idx]); cur = points[idx]; }
    return d;
  }

  let best = path, bestD = dist(best);
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const cand = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1));
        const d = dist(cand);
        if (d + 1e-6 < bestD) { best = cand; bestD = d; improved = true; }
      }
    }
  }
  return best;
}

export function legsMinutesFromOrder(
  origin: LatLng,
  points: LatLng[],
  order: number[],
  speedKmh: number,
  serviceMinPerStop: number
) {
  const mins: number[] = [];
  let cur = origin;
  for (const idx of order) {
    const km = haversineKm(cur, points[idx]);
    const travelMin = (km / Math.max(speedKmh, 1)) * 60;
    mins.push(Math.round(travelMin));
    cur = points[idx];
  }
  const travelTotal = mins.reduce((a, b) => a + b, 0);
  const serviceTotal = Math.round(order.length * Math.max(serviceMinPerStop, 0));
  return { legs: mins, total: travelTotal + serviceTotal, travelOnly: travelTotal, serviceOnly: serviceTotal };
}
