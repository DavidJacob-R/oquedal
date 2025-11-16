// app/admin/pedidos/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function addr(
  d: { direccion: string | null; ciudad: string | null; estado: string | null; cp: string | null }
) {
  const parts = [d.direccion, d.ciudad, d.estado, d.cp].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

async function getData(id: string) {
  const p = await query(
    `SELECT
       p.id, p.folio, p.fecha, p.tipo, p.franja_horaria,
       p.origen_direccion, p.origen_ciudad, p.origen_estado, p.origen_cp,
       p.destino_direccion, p.destino_ciudad, p.destino_estado, p.destino_cp,
       p.contacto_nombre, p.contacto_tel,
       p.descripcion, p.volumen_m3, p.peso_kg, p.precio_estimado,
       p.estado, p.estado_entrega, p.asignado_a,
       c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono AS cliente_tel, c.email AS cliente_email,
       u.nombre AS asignado_nombre
     FROM public.pedido p
     JOIN public.cliente c ON c.id = p.cliente_id
LEFT JOIN public.usuario u ON u.id = p.asignado_a
    WHERE p.id = $1
    LIMIT 1`,
    [id]
  );
  if (!p.rows?.length) return null;

  const items = await query(
    `SELECT
       i.id, i.cantidad, i.peso_kg,
       pr.nombre AS producto, pr.sku, pr.unidad
     FROM public.pedido_item i
     JOIN public.producto pr ON pr.id = i.producto_id
    WHERE i.pedido_id = $1
    ORDER BY pr.nombre ASC`,
    [id]
  );

  const pr = await query(
    `SELECT pr.id AS parada_id, pr.ruta_id, r.estado AS estado_ruta, pr.secuencia
       FROM public.parada_ruta pr
  LEFT JOIN public.ruta r ON r.id = pr.ruta_id
      WHERE pr.pedido_id = $1
      ORDER BY pr.secuencia ASC
      LIMIT 1`,
    [id]
  );

  return {
    pedido: p.rows[0],
    items: items.rows || [],
    parada: pr.rows?.[0] || null,
  };
}

export default async function PedidoDetallePage({ params }: { params: { id: string } }) {
  const data = await getData(params.id);
  if (!data) notFound();

  const p = data.pedido as any;
  const items = data.items as any[];
  const parada = data.parada as any | null;

  const origen = addr({
    direccion: p.origen_direccion,
    ciudad: p.origen_ciudad,
    estado: p.origen_estado,
    cp: p.origen_cp,
  });
  const destino = addr({
    direccion: p.destino_direccion,
    ciudad: p.destino_ciudad,
    estado: p.destino_estado,
    cp: p.destino_cp,
  });

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-100">
            Pedido • Folio #{p.folio}
          </h1>
          <p className="text-sm text-neutral-400">
            {p.tipo} • {new Date(p.fecha).toLocaleDateString()} • Estado:{" "}
            <span className="text-neutral-200">{p.estado}</span>{" "}
            — Entrega: <span className="text-neutral-200">{p.estado_entrega}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/pedidos"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-neutral-200 hover:bg-white/10"
          >
            ← Volver
          </Link>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <section className="rounded-xl border border-white/10 bg-neutral-950/40 p-4">
          <h2 className="text-sm font-medium text-neutral-200 mb-2">Cliente</h2>
          <div className="text-sm text-neutral-300">{p.cliente_nombre}</div>
          <div className="text-sm text-neutral-400">{p.cliente_email || "—"}</div>
          <div className="text-sm text-neutral-400">{p.cliente_tel || "—"}</div>
        </section>

        <section className="rounded-xl border border-white/10 bg-neutral-950/40 p-4">
          <h2 className="text-sm font-medium text-neutral-200 mb-2">Contacto entrega</h2>
          <div className="text-sm text-neutral-300">{p.contacto_nombre || "—"}</div>
          <div className="text-sm text-neutral-400">{p.contacto_tel || "—"}</div>
          <div className="text-sm text-neutral-400">Ventana: {p.franja_horaria || "—"}</div>
        </section>

        <section className="rounded-xl border border-white/10 bg-neutral-950/40 p-4">
          <h2 className="text-sm font-medium text-neutral-200 mb-2">Asignación</h2>
          <div className="text-sm text-neutral-300">
            Repartidor: {p.asignado_nombre || "—"}
          </div>
          {parada ? (
            <>
              <div className="text-sm text-neutral-400">Ruta: {parada.ruta_id}</div>
              <div className="text-sm text-neutral-400">Estado ruta: {parada.estado_ruta || "—"}</div>
              <div className="text-sm text-neutral-400">Secuencia: {parada.secuencia}</div>
            </>
          ) : (
            <div className="text-sm text-neutral-400">Sin parada/ruta</div>
          )}
        </section>
      </div>

      {/* Direcciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <section className="rounded-xl border border-white/10 bg-neutral-950/40 p-4">
          <h2 className="text-sm font-medium text-neutral-200 mb-2">Origen</h2>
          <p className="text-sm text-neutral-300">{origen}</p>
        </section>
        <section className="rounded-xl border border-white/10 bg-neutral-950/40 p-4">
          <h2 className="text-sm font-medium text-neutral-200 mb-2">Destino</h2>
          <p className="text-sm text-neutral-300">{destino}</p>
        </section>
      </div>

      {/* Métricas y notas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <section className="rounded-xl border border-white/10 bg-neutral-950/40 p-4">
          <h2 className="text-sm font-medium text-neutral-200 mb-2">Métricas</h2>
          <div className="text-sm text-neutral-300">Peso: {p.peso_kg ?? "—"} kg</div>
          <div className="text-sm text-neutral-300">Volumen: {p.volumen_m3 ?? "—"} m³</div>
          <div className="text-sm text-neutral-300">Precio estimado: {p.precio_estimado ?? "—"}</div>
        </section>
        <section className="md:col-span-2 rounded-xl border border-white/10 bg-neutral-950/40 p-4">
          <h2 className="text-sm font-medium text-neutral-200 mb-2">Descripción</h2>
          <p className="text-sm text-neutral-300 whitespace-pre-wrap">
            {p.descripcion || "—"}
          </p>
        </section>
      </div>

      {/* Items */}
      <section className="rounded-xl border border-white/10 bg-neutral-950/40 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-neutral-200">Items del pedido</h2>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-neutral-400">Sin items</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-400">
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-3">Producto</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Unidad</th>
                  <th className="py-2 pr-3">Cantidad</th>
                  <th className="py-2 pr-3">Peso (kg)</th>
                </tr>
              </thead>
              <tbody className="text-neutral-200">
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-3">{it.producto}</td>
                    <td className="py-2 pr-3">{it.sku}</td>
                    <td className="py-2 pr-3">{it.unidad}</td>
                    <td className="py-2 pr-3">{Number(it.cantidad)}</td>
                    <td className="py-2 pr-3">{it.peso_kg == null ? "—" : Number(it.peso_kg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
