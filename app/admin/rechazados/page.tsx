"use client";
import { useEffect, useState } from "react";

type Row = {
  id: string;
  folio?: number | null;
  folio_str?: string | null;
  estado: string | null;
  cliente_nombre?: string | null;
  cliente_email?: string | null;
  fecha: string | null;
};

export default function AdminRechazadosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function cargar() {
    setLoading(true); setErr(null);
    try {
      const qs = new URLSearchParams();
      qs.set("estado", "cancelados");
      if (q.trim()) qs.set("q", q.trim());
      qs.set("limit", "200");
      const r = await fetch(`/api/admin/pedidios?${qs.toString()}`, { cache: "no-store" });
      if (r.status === 401) { window.location.href = "/login"; return; }
      const j = await r.json();
      if (!j.ok) throw new Error(j.msg || "No se pudo cargar");
      setRows(Array.isArray(j.pedidos) ? j.pedidos : []);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, [q]);

  const go = (p: string) => { window.location.href = p; };

  async function setEstado(id: string, estado: "confirmado" | "pendiente") {
    setSavingId(id);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/pedidios/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.msg || "No se pudo actualizar");
      await cargar();
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="flex gap-2">
          <a href="/admin/panel" className="px-3 py-1.5 rounded-lg text-sm border border-zinc-800 text-zinc-300 hover:bg-zinc-900/50">Pendientes</a>
          <a href="/admin/aceptados" className="px-3 py-1.5 rounded-lg text-sm border border-zinc-800 text-zinc-300 hover:bg-zinc-900/50">Aceptados</a>
          <a href="/admin/rechazados" className="px-3 py-1.5 rounded-lg text-sm border border-violet-500/70 bg-zinc-900 text-zinc-100">Rechazados</a>
        </div>
        <input
          placeholder="Buscar por folio o cliente"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="ml-auto rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500"
        />
      </div>

      <h1 className="text-2xl font-semibold text-zinc-100 mb-3">Pedidos rechazados</h1>

      {loading && <p className="text-sm text-zinc-400">Cargando…</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {!loading && !err && (
        <div className="overflow-hidden rounded-xl border border-zinc-800/70">
          <table className="min-w-full text-sm text-zinc-200">
            <thead className="bg-zinc-900/60">
              <tr>
                <th className="px-3 py-2 text-left">Folio</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td className="px-3 py-4 text-zinc-400" colSpan={4}>Sin resultados.</td></tr>}
              {rows.map((r) => {
                const id = encodeURIComponent(r.id);
                const folio = r.folio_str || (r.folio != null ? String(r.folio) : "");
                const disabled = savingId === r.id;
                return (
                  <tr key={r.id} className="border-t border-zinc-800/70">
                    <td className="px-3 py-2 font-semibold">{folio}</td>
                    <td className="px-3 py-2">{r.fecha?.slice(0,10) || ""}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{r.cliente_nombre || "Cliente"}</span>
                        <span className="text-xs text-zinc-400">{r.cliente_email || ""}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => go(`/admin/pedido/${id}`)} className="px-2 py-1 rounded-md border border-zinc-700 hover:bg-zinc-800/60">Ver</button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => setEstado(r.id, "confirmado")}
                          className="px-2 py-1 rounded-md border border-emerald-600 text-emerald-300 hover:bg-emerald-600/10 disabled:opacity-60"
                        >
                          {disabled ? "..." : "Aceptar"}
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => setEstado(r.id, "pendiente")}
                          className="px-2 py-1 rounded-md border border-amber-500 text-amber-300 hover:bg-amber-500/10 disabled:opacity-60"
                        >
                          {disabled ? "..." : "Volver a pendiente"}
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
