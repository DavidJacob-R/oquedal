"use client";

// app/admin/pedidos/page.tsx
import React, { useEffect, useState } from "react";

type Pedido = {
  id: string;
  cliente: string;
  creado_en: string; // ISO
  estado: "pendiente" | "en_entrega" | "cancelado" | "entregado";
  direccion_recoleccion?: string;
  direccion_entrega?: string;
  estimado_horas?: number; // estimacion de trabajo en horas
};

export default function AdminPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filter, setFilter] = useState<"todos" | "en_entrega" | "cancelado">("todos");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/pedidos/listado", { cache: "no-store" });
    const j = await res.json();
    setPedidos(j.pedidos || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const shown = pedidos
    .sort((a,b)=> +new Date(b.creado_en) - +new Date(a.creado_en)) // orden por registro, mas reciente primero
    .filter(p => filter === "todos" ? true : (filter === "en_entrega" ? p.estado === "en_entrega" : p.estado === "cancelado"));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pedidos</h1>
        <div className="flex items-center gap-2">
          <button onClick={()=>setFilter("todos")} className={`px-3 py-1 rounded ${filter==="todos"?"bg-orange-600/20":"bg-white/5"}`}>Todos</button>
          <button onClick={()=>setFilter("en_entrega")} className={`px-3 py-1 rounded ${filter==="en_entrega"?"bg-orange-600/20":"bg-white/5"}`}>En proceso</button>
          <button onClick={()=>setFilter("cancelado")} className={`px-3 py-1 rounded ${filter==="cancelado"?"bg-orange-600/20":"bg-white/5"}`}>Cancelados</button>
          <button onClick={load} className="px-3 py-1 rounded bg-white/5">Refrescar</button>
        </div>
      </div>

      {loading ? <div>Cargando...</div> : (
        <div className="space-y-3">
          {shown.map(p => (
            <div key={p.id} className="rounded-lg border border-white/6 p-3 bg-neutral-900/30">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium">#{p.id} — {p.cliente}</div>
                  <div className="text-xs text-neutral-400">Registrado: {new Date(p.creado_en).toLocaleString()}</div>
                </div>
                <div className="text-sm">
                  <span className={`px-2 py-1 rounded ${p.estado==="cancelado"?"bg-red-600/20":p.estado==="en_entrega"?"bg-yellow-600/20":"bg-white/5"}`}>
                    {p.estado}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-sm text-neutral-300">
                {p.direccion_recoleccion && <div>Recojer: {p.direccion_recoleccion}</div>}
                {p.direccion_entrega && <div>Entregar: {p.direccion_entrega}</div>}
                {typeof p.estimado_horas === "number" && <div>Estimado (h): {p.estimado_horas.toFixed(2)}</div>}
              </div>
            </div>
          ))}
          {shown.length===0 && <div className="text-neutral-400">No hay pedidos con este filtro.</div>}
        </div>
      )}
    </div>
  );
}
