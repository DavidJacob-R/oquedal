"use client";
import { useEffect, useState } from "react";

type Pedido = {
  id: string;
  folio: number | null;
  folio_str: string | null;
  fecha: string | null;
  estado_entrega: "pendiente" | "completo" | "incompleto";
  origen_direccion: string | null; origen_ciudad: string | null; origen_estado: string | null; origen_cp: string | null;
  destino_direccion: string | null; destino_ciudad: string | null; destino_estado: string | null; destino_cp: string | null;
  contacto_nombre: string | null; contacto_tel: string | null;
  entregado_en?: string | null;
  motivo?: string | null;
  nota?: string | null;
  marcado_en?: string | null;
};

export default function AdminEntregasPage() {
  const [data, setData] = useState<{pendientes:Pedido[]; completos:Pedido[]; incompletos:Pedido[]}>({ pendientes:[], completos:[], incompletos:[] });
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/admin/pedidos/estado-entrega", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.msg || "Error");
      setData({ pendientes: j.pendientes || [], completos: j.completos || [], incompletos: j.incompletos || [] });
    } catch (e:any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ cargar(); }, []);

  function addr(p: Pedido, kind: "origen"|"destino") {
    const d = [
      (p as any)[`${kind}_direccion`],
      (p as any)[`${kind}_ciudad`],
      (p as any)[`${kind}_estado`],
      (p as any)[`${kind}_cp`],
    ].filter(Boolean).join(", ");
    return d || "-";
  }

  function Section({title, items}:{title:string; items:Pedido[]}) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-zinc-100 mb-3">{title} <span className="text-zinc-400 text-sm">({items.length})</span></h2>
        <div className="space-y-2">
          {items.map(p=>(
            <div key={p.id} className="rounded-lg border border-zinc-800 bg-[#0b0b10]/80 p-3">
              <div className="flex items-center justify-between">
                <div className="text-zinc-200">
                  <span className="text-zinc-400 mr-2">Folio</span>
                  <span className="font-medium">{p.folio_str || p.folio || "-"}</span>
                  <span className="mx-3 text-zinc-500">•</span>
                  <span className="text-zinc-400 mr-2">Fecha</span>
                  <span>{p.fecha ? new Date(p.fecha).toLocaleDateString() : "Sin fecha"}</span>
                </div>
                <div className="text-xs text-zinc-400">
                  {p.estado_entrega === "completo" && p.entregado_en ? `Entregado: ${new Date(p.entregado_en).toLocaleString()}` : null}
                  {p.estado_entrega === "incompleto" && p.marcado_en ? `Marcado: ${new Date(p.marcado_en).toLocaleString()}` : null}
                </div>
              </div>
              <div className="mt-1 text-sm text-zinc-300">
                <div><span className="text-zinc-400">Origen:</span> {addr(p, "origen")}</div>
                <div><span className="text-zinc-400">Destino:</span> {addr(p, "destino")}</div>
              </div>
              {p.estado_entrega === "incompleto" && (
                <div className="mt-2 text-xs text-amber-300">
                  <div><span className="text-amber-400">Motivo:</span> {p.motivo || "-"}</div>
                  <div><span className="text-amber-400">Nota:</span> {p.nota || "-"}</div>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-zinc-500">Sin elementos</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-zinc-100 mb-4">Entregas</h1>
      {loading && <p className="text-sm text-zinc-400">Cargando...</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}
      {!loading && !err && (
        <>
          <Section title="Pendientes de entrega (aceptados)" items={data.pendientes}/>
          <Section title="Completos" items={data.completos}/>
          <Section title="Incompletos" items={data.incompletos}/>
        </>
      )}
    </div>
  );
}
