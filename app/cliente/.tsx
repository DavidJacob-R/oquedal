"use client";

import { useEffect, useMemo, useState } from "react";

type Pedido = {
  id: string;
  cliente_id: string;
  tipo: string;
  fecha?: string | null;
  franja_horaria?: string | null;
  origen_direccion: string;
  origen_ciudad?: string | null;
  origen_estado?: string | null;
  origen_cp?: string | null;
  destino_direccion: string;
  destino_ciudad?: string | null;
  destino_estado?: string | null;
  destino_cp?: string | null;
  contacto_nombre: string;
  contacto_tel: string;
  descripcion?: string | null;
  estado?: string | null;
  estatus?: string | null;
  status?: string | null;
  estado_pedido?: string | null;
  accion?: string | null;
};

function normEstado(e?: string | null) {
  const v = (e || "").trim().toLowerCase();
  if (!v) return "pendiente";
  const aceptados = new Set([
    "aceptado","aprobado","accept","accepted","approve","approved","ok","confirmado","confirmar","aceptar","acepto"
  ]);
  const rechazados = new Set([
    "rechazado","denegado","reject","rejected","rechazar","rechazo","cancelado","cancelled","cancelado_por_admin"
  ]);
  if (aceptados.has(v)) return "aceptado";
  if (rechazados.has(v)) return "rechazado";
  return "pendiente";
}

function resolveEstado(p: Pedido) {
  const raw = p.estado ?? p.estatus ?? p.status ?? p.estado_pedido ?? p.accion ?? "pendiente";
  return normEstado(raw);
}

function fmtFecha(d?: string | null) {
  if (!d) return "s/f";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d!;
    return dt.toLocaleDateString();
  } catch {
    return d!;
  }
}

function chipClasses(estado: string) {
  switch (estado) {
    case "aceptado": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "rechazado": return "bg-red-500/15 text-red-300 border-red-500/30";
    default: return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  }
}

function PedidoItem({ p }: { p: Pedido }) {
  const e = resolveEstado(p);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-zinc-400">ID</div>
        <div className="text-xs font-mono text-zinc-400">{p.id}</div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-zinc-200">{p.tipo || "Pedido"}</div>
        <span className={`text-xs rounded-full px-2 py-0.5 border ${chipClasses(e)}`}>
          {e.charAt(0).toUpperCase() + e.slice(1)}
        </span>
      </div>
      <div className="text-sm text-zinc-400">
        <span className="text-zinc-300">Fecha:</span> {fmtFecha(p.fecha)}
      </div>
      <div className="text-sm text-zinc-400">
        <span className="text-zinc-300">Origen:</span> {p.origen_direccion}
        {p.origen_ciudad ? `, ${p.origen_ciudad}` : ""}{p.origen_estado ? `, ${p.origen_estado}` : ""}
      </div>
      <div className="text-sm text-zinc-400">
        <span className="text-zinc-300">Destino:</span> {p.destino_direccion}
        {p.destino_ciudad ? `, ${p.destino_ciudad}` : ""}{p.destino_estado ? `, ${p.destino_estado}` : ""}
      </div>
      {p.descripcion ? (
        <div className="text-sm text-zinc-400">
          <span className="text-zinc-300">Descripcion:</span> {p.descripcion}
        </div>
      ) : null}
      <div className="text-xs text-zinc-500">Contacto: {p.contacto_nombre} • {p.contacto_tel}</div>
    </div>
  );
}

export default function PedidosClientePage() {
  const [rows, setRows] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState<"todos" | "pendiente" | "aceptado" | "rechazado">("todos");

  async function cargar() {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/pedidos?t=${Date.now()}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.msg || "error");
      const data: Pedido[] = Array.isArray(j.rows) ? j.rows : [];
      setRows(data);
    } catch {
      setErr("No se pudieron cargar los pedidos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(p => {
      const est = resolveEstado(p);
      if (fEstado !== "todos" && est !== fEstado) return false;
      if (!term) return true;
      const hay = [
        p.id, p.tipo, p.origen_direccion, p.destino_direccion,
        p.contacto_nombre, p.contacto_tel, est
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [rows, q, fEstado]);

  const { pendientes, aceptados, rechazados, counts } = useMemo(() => {
    const g = { pendientes: [] as Pedido[], aceptados: [] as Pedido[], rechazados: [] as Pedido[] };
    for (const p of filtrados) {
      const e = resolveEstado(p);
      if (e === "aceptado") g.aceptados.push(p);
      else if (e === "rechazado") g.rechazados.push(p);
      else g.pendientes.push(p);
    }
    const sorter = (a: Pedido, b: Pedido) => {
      const da = a.fecha ? new Date(a.fecha).getTime() : 0;
      const db = b.fecha ? new Date(b.fecha).getTime() : 0;
      if (da !== db) return db - da;
      return String(a.id).localeCompare(String(b.id));
    };
    g.pendientes.sort(sorter);
    g.aceptados.sort(sorter);
    g.rechazados.sort(sorter);
    const counts = {
      total: rows.length,
      pendientes: rows.filter(r => resolveEstado(r) === "pendiente").length,
      aceptados: rows.filter(r => resolveEstado(r) === "aceptado").length,
      rechazados: rows.filter(r => resolveEstado(r) === "rechazado").length,
    };
    return { ...g, counts };
  }, [filtrados, rows]);

  return (
    <div className="max-w-4xl mx-auto grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis pedidos</h1>
        <button
          onClick={cargar}
          disabled={loading}
          className="rounded-xl px-3 py-1.5 text-sm text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
        >
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-xs text-zinc-400">Total</div>
          <div className="text-2xl font-semibold">{counts.total}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-xs text-zinc-400">Pendientes</div>
          <div className="text-2xl font-semibold">{counts.pendientes}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-xs text-zinc-400">Aceptados</div>
          <div className="text-2xl font-semibold">{counts.aceptados}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-xs text-zinc-400">Rechazados</div>
          <div className="text-2xl font-semibold">{counts.rechazados}</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por id, tipo, direccion, contacto..."
          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2"
        />
        <select
          value={fEstado}
          onChange={(e) => setFEstado(e.target.value as any)}
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2"
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="aceptado">Aceptado</option>
          <option value="rechazado">Rechazado</option>
        </select>
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pendientes</h2>
          <span className="text-xs text-zinc-400">{pendientes.length} pedido(s)</span>
        </div>
        {pendientes.length === 0 ? (
          <div className="text-sm text-zinc-400">No tienes pedidos pendientes.</div>
        ) : (
          <div className="grid gap-3">
            {pendientes.map((p) => <PedidoItem key={p.id} p={p} />)}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aceptados</h2>
          <span className="text-xs text-zinc-400">{aceptados.length} pedido(s)</span>
        </div>
        {aceptados.length === 0 ? (
          <div className="text-sm text-zinc-400">No tienes pedidos aceptados.</div>
        ) : (
          <div className="grid gap-3">
            {aceptados.map((p) => <PedidoItem key={p.id} p={p} />)}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rechazados</h2>
          <span className="text-xs text-zinc-400">{rechazados.length} pedido(s)</span>
        </div>
        {rechazados.length === 0 ? (
          <div className="text-sm text-zinc-400">No tienes pedidos rechazados.</div>
        ) : (
          <div className="grid gap-3">
            {rechazados.map((p) => <PedidoItem key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
