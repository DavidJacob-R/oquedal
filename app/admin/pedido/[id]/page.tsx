"use client";
import { useEffect, useState } from "react";

type Item = { id: string; cantidad: number; peso_kg: number | null; nombre: string; sku: string; unidad: string };
type Pedido = {
  id: string;
  folio: number;
  folio_str: string | null;
  tipo: string;
  estado: string;
  fecha: string | null;
  created_at: string | null;
  origen: string | null;
  destino: string | null;
  contacto_nombre: string | null;
  contacto_tel: string | null;
  descripcion: string | null;
  cliente_id: string;
  cliente_nombre: string | null;
  cliente_tel: string | null;
  cliente_email: string | null;
};

export default function PedidoDetallePage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id || "");
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const r = await fetch(`/api/admin/pedidios/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (r.status === 401) { window.location.href = "/login"; return; }
        const j = await r.json();
        if (!j.ok) throw new Error(j.msg || "No se pudo cargar");
        if (!alive) return;
        setPedido(j.pedido);
        setItems(Array.isArray(j.items) ? j.items : []);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const doAccion = async (accion: "aceptar" | "rechazar") => {
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/pedidios/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, observacion }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.msg || "No se pudo actualizar");
      window.location.href = "/admin/panel";
    } catch (e: any) {
      setErr(e?.message || "Error");
      setSaving(false);
    }
  };

  const fecha = pedido?.fecha || (pedido?.created_at ? String(pedido.created_at).slice(0,10) : "");
  const folio = pedido?.folio_str || (pedido?.folio != null ? String(pedido.folio) : "");

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <a href="/admin/panel" className="text-sm text-zinc-300 hover:text-zinc-100">&larr; Volver</a>
      <h1 className="text-2xl font-semibold text-zinc-100 mt-2 mb-4">Pedido</h1>

      {loading && <p className="text-sm text-zinc-400">Cargando…</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {pedido && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800/70 p-4 bg-[#0b0b10]/80">
            <h2 className="font-medium text-zinc-100 mb-2">Información</h2>
            <div className="text-sm text-zinc-300 space-y-1">
              <div><span className="text-zinc-400">Folio: </span>{folio}</div>
              <div><span className="text-zinc-400">ID: </span>{pedido.id}</div>
              <div><span className="text-zinc-400">Fecha: </span>{fecha}</div>
              <div><span className="text-zinc-400">Tipo: </span>{pedido.tipo}</div>
              <div><span className="text-zinc-400">Estado: </span><span className="capitalize">{pedido.estado}</span></div>
              <div><span className="text-zinc-400">Cliente: </span>{pedido.cliente_nombre || "Cliente"}</div>
              <div><span className="text-zinc-400">Email: </span>{pedido.cliente_email || ""}</div>
              <div><span className="text-zinc-400">Tel: </span>{pedido.cliente_tel || ""}</div>
            </div>

            <h3 className="mt-4 font-medium text-zinc-100">Ruta</h3>
            <div className="text-sm text-zinc-300">
              <div><span className="text-zinc-400">Origen: </span>{pedido.origen || ""}</div>
              <div><span className="text-zinc-400">Destino: </span>{pedido.destino || ""}</div>
            </div>

            <h3 className="mt-4 font-medium text-zinc-100">Contacto</h3>
            <div className="text-sm text-zinc-300">
              <div>{pedido.contacto_nombre || ""}</div>
              <div>{pedido.contacto_tel || ""}</div>
            </div>

            {pedido.descripcion && (
              <>
                <h3 className="mt-4 font-medium text-zinc-100">Notas / Observaciones</h3>
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/60">
{pedido.descripcion}
                </pre>
              </>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800/70 p-4 bg-[#0b0b10]/80">
            <h2 className="font-medium text-zinc-100 mb-2">Artículos</h2>
            {items.length === 0 && <p className="text-sm text-zinc-400">Sin artículos.</p>}
            {items.length > 0 && (
              <div className="text-sm text-zinc-300 space-y-2">
                {items.map(it => (
                  <div key={it.id} className="flex justify-between border-b border-zinc-800/60 pb-1">
                    <div className="pr-2">
                      <div className="font-medium">{it.nombre}</div>
                      <div className="text-xs text-zinc-400">{it.sku} · {it.unidad}</div>
                    </div>
                    <div className="text-right">
                      <div>{it.cantidad}</div>
                      {it.peso_kg != null && <div className="text-xs text-zinc-400">{it.peso_kg} kg</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 className="mt-4 font-medium text-zinc-100">Observaciones</h3>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Escribe una observación (opcional)…"
              className="w-full mt-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-violet-500"
              rows={4}
            />

            <div className="mt-3 flex gap-2">
              <button
                disabled={saving}
                onClick={() => doAccion("aceptar")}
                className="px-3 py-2 rounded-lg text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Aceptar pedido"}
              </button>
              <button
                disabled={saving}
                onClick={() => doAccion("rechazar")}
                className="px-3 py-2 rounded-lg text-sm text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Rechazar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
