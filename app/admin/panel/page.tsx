"use client";
import { useEffect, useState } from "react";

type Pedido = {
  id: string;
  folio?: number | null;
  folio_str?: string | null;
  tipo: string | null;
  estado: string | null;
  fecha: string | null;
  created_at: string | null;
  origen: string | null;
  destino: string | null;
  contacto_nombre: string | null;
  contacto_tel: string | null;
  cliente_id?: string;
  cliente_nombre?: string | null;
  cliente_tel?: string | null;
  cliente_email?: string | null;
};

export default function AdminPendientesPage() {
  const [data, setData] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function cargar() {
    setLoading(true); setErr(null);
    try {
      const qs = new URLSearchParams();
      qs.set("estado", "pendientes");
      if (q.trim()) qs.set("q", q.trim());
      qs.set("limit", "200");
      const r = await fetch(`/api/admin/pedidios?${qs.toString()}`, { cache: "no-store" });
      if (r.status === 401) { window.location.href = "/login"; return; }
      const j = await r.json();
      if (!j.ok) throw new Error(j.msg || "No se pudo cargar");
      setData(Array.isArray(j.pedidos) ? j.pedidos : []);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, [q]);

  const go = (path: string) => { window.location.href = path; };

  async function patch(id: string, accion: "aceptar" | "rechazar") {
    setSavingId(id);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/pedidios/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.msg || "No se pudo actualizar");
      await cargar(); // se refresca la lista; el pedido sale de Pendientes
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-zinc-100 mb-4">Pedidos pendientes</h1>

      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="flex gap-2">
          <a href="/admin/panel" className="px-3 py-1.5 rounded-lg text-sm border border-violet-500/70 bg-zinc-900 text-zinc-100">Pendientes</a>
          <a href="/admin/aceptados" className="px-3 py-1.5 rounded-lg text-sm border border-zinc-800 text-zinc-300 hover:bg-zinc-900/50">Aceptados</a>
          <a href="/admin/rechazados" className="px-3 py-1.5 rounded-lg text-sm border border-zinc-800 text-zinc-300 hover:bg-zinc-900/50">Rechazados</a>
        </div>
        <input
          placeholder="Buscar por folio, cliente, ruta..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="ml-auto rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500"
        />
      </div>

      {loading && <p className="text-sm text-zinc-400">Cargando pedidos...</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {!loading && !err && (
        <div className="overflow-hidden rounded-xl border border-zinc-800/70">
          <table className="min-w-full text-sm text-zinc-200">
            <thead className="bg-zinc-900/60">
              <tr>
                <th className="px-3 py-2 text-left">Folio</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Origen → Destino</th>
                <th className="px-3 py-2 text-left">Contacto</th>
                <th className="px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr><td className="px-3 py-4 text-zinc-400" colSpan={8}>No hay pedidos.</td></tr>
              )}

              {data.map((p) => {
                const id = encodeURIComponent(String(p.id || ""));
                const fecha = p.fecha || (p.created_at ? p.created_at.slice(0,10) : "");
                const ruta = [p.origen || "", p.destino || ""].filter(Boolean).join(" → ");
                const contacto = [p.contacto_nombre || "", p.contacto_tel || ""].filter(Boolean).join(" · ");
                const clienteNombre = p.cliente_nombre ?? "Cliente";
                const clienteEmail = p.cliente_email ?? "";
                const folioTxt = p.folio_str || (p.folio != null ? String(p.folio) : "");
                const disabled = savingId === p.id;

                return (
                  <tr key={p.id} className="border-t border-zinc-800/70">
                    <td className="px-3 py-2 font-semibold">{folioTxt}</td>
                    <td className="px-3 py-2">{fecha}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{clienteNombre}</span>
                        <span className="text-xs text-zinc-400">{clienteEmail}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 capitalize">{p.tipo || ""}</td>
                    <td className="px-3 py-2 capitalize">{p.estado || ""}</td>
                    <td className="px-3 py-2 truncate max-w-[240px]">{ruta}</td>
                    <td className="px-3 py-2">{contacto}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => go(`/admin/pedido/${id}`)}
                          className="px-2 py-1 rounded-md border border-zinc-700 hover:bg-zinc-800/60"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => patch(p.id, "aceptar")}
                          className="px-2 py-1 rounded-md border border-emerald-600 text-emerald-300 hover:bg-emerald-600/10 disabled:opacity-60"
                        >
                          {disabled ? "..." : "Aceptar"}
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => patch(p.id, "rechazar")}
                          className="px-2 py-1 rounded-md border border-rose-600 text-rose-300 hover:bg-rose-600/10 disabled:opacity-60"
                        >
                          {disabled ? "..." : "Rechazar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
