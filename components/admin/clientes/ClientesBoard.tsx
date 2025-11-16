// components/admin/clientes/ClientesBoard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  usuario_id: string | null;
  creado_en: string | null;
  pedidos: number;
  direcciones: number;
};

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "ok" | "warn" | "danger" | "default";
}) {
  const cls =
    tone === "danger"
      ? "ring-red-500/40 text-red-200 bg-red-500/10"
      : tone === "warn"
      ? "ring-amber-500/40 text-amber-200 bg-amber-500/10"
      : tone === "ok"
      ? "ring-emerald-500/40 text-emerald-200 bg-emerald-500/10"
      : "ring-white/10 text-neutral-300 bg-white/5";
  return <span className={`rounded-full px-2 py-1 text-[11px] ring-1 ${cls}`}>{children}</span>;
}

function ClienteCard({
  c,
  onToggle,
  onDelete,
  onUpdate,
}: {
  c: Cliente;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Pick<Cliente, "nombre" | "telefono" | "email">>) => Promise<void>;
}) {
  const [edit, setEdit] = useState(false);
  const [nombre, setNombre] = useState(c.nombre);
  const [telefono, setTelefono] = useState(c.telefono ?? "");
  const [email, setEmail] = useState(c.email ?? "");
  const blockedDelete = (c.pedidos > 0 || c.direcciones > 0);

  useEffect(() => {
    if (!edit) {
      setNombre(c.nombre);
      setTelefono(c.telefono ?? "");
      setEmail(c.email ?? "");
    }
  }, [c, edit]);

  return (
    <article className="group rounded-2xl border border-white/10 bg-neutral-950/40 p-4 ring-1 ring-black/30 hover:bg-neutral-900/40 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[15px] font-medium text-neutral-100 truncate">{c.nombre}</div>
            {c.activo ? <Badge tone="ok">Activo</Badge> : <Badge tone="danger">Inactivo</Badge>}
          </div>
          <div className="text-[12px] text-neutral-400 truncate">Email: <span className="text-neutral-300">{c.email ?? "—"}</span></div>
          <div className="text-[12px] text-neutral-400 truncate">Tel: <span className="text-neutral-300">{c.telefono ?? "—"}</span></div>
          <div className="text-[12px] text-neutral-400">
            Pedidos: <span className="text-neutral-200">{c.pedidos}</span> • Direcciones: <span className="text-neutral-200">{c.direcciones}</span>
          </div>
          <div className="text-[12px] text-neutral-500">
            {c.creado_en ? `Creado: ${new Date(c.creado_en).toLocaleString("es-MX")}` : "Creado: —"}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {!edit ? (
            <>
              <button
                onClick={() => setEdit(true)}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-neutral-200 ring-1 ring-white/10 hover:bg-white/10"
              >
                Editar
              </button>
              <button
                onClick={() => onToggle(c.id)}
                className={`rounded-lg px-3 py-1.5 text-xs ring-1 ${
                  c.activo
                    ? "bg-amber-500/15 text-amber-200 ring-amber-500/30 hover:bg-amber-500/25"
                    : "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30 hover:bg-emerald-500/25"
                }`}
              >
                {c.activo ? "Desactivar" : "Activar"}
              </button>
              <button
                onClick={() => {
                  if (blockedDelete) {
                    alert("No se puede eliminar: tiene pedidos o direcciones. Desactívalo en su lugar.");
                    return;
                  }
                  if (confirm("Eliminar permanentemente este cliente? Esta acción no se puede deshacer.")) {
                    onDelete(c.id);
                  }
                }}
                className={`rounded-lg px-3 py-1.5 text-xs ring-1 ${
                  blockedDelete
                    ? "bg-red-500/10 text-red-300/60 ring-red-500/20 cursor-not-allowed"
                    : "bg-red-500/15 text-red-200 ring-red-500/30 hover:bg-red-500/25"
                }`}
                title={blockedDelete ? "Tiene dependencias; no se puede eliminar" : "Eliminar permanentemente"}
                disabled={blockedDelete}
              >
                Eliminar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={async () => {
                  await onUpdate(c.id, { nombre: nombre.trim(), telefono: telefono.trim(), email: email.trim() });
                  setEdit(false);
                }}
                className="rounded-lg bg-orange-500/20 px-3 py-1.5 text-xs text-orange-200 ring-1 ring-orange-500/30 hover:bg-orange-500/25"
              >
                Guardar
              </button>
              <button
                onClick={() => setEdit(false)}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-neutral-200 ring-1 ring-white/10 hover:bg-white/10"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {edit && (
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div>
            <label className="text-[11px] text-neutral-400">Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full rounded-lg bg-neutral-800/70 px-2 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
            />
          </div>
          <div>
            <label className="text-[11px] text-neutral-400">Teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="mt-1 w-full rounded-lg bg-neutral-800/70 px-2 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
            />
          </div>
          <div>
            <label className="text-[11px] text-neutral-400">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-neutral-800/70 px-2 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
            />
          </div>
        </div>
      )}
    </article>
  );
}

export default function ClientesBoard() {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/clientes/list", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || "Error");
      setClientes(j.clientes || []);
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar los clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggle(id: string) {
    const res = await fetch("/api/admin/clientes/toggle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert(j?.error || "No se pudo cambiar el estado.");
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, activo: !!j.activo } : c)));
  }

  async function remove(id: string) {
    const res = await fetch("/api/admin/clientes/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert(j?.error || "No se pudo eliminar.");
    setClientes((prev) => prev.filter((c) => c.id !== id));
  }

  async function update(id: string, patch: Partial<Pick<Cliente, "nombre" | "telefono" | "email">>) {
    const res = await fetch("/api/admin/clientes/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert(j?.error || "No se pudo actualizar.");
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  const s = q.trim().toLowerCase();
  const filtrados = useMemo(() => {
    if (!s) return clientes;
    return clientes.filter((c) =>
      (c.nombre || "").toLowerCase().includes(s) ||
      (c.email || "").toLowerCase().includes(s) ||
      (c.telefono || "").toLowerCase().includes(s)
    );
  }, [clientes, s]);

  const activos = useMemo(() => filtrados.filter((c) => c.activo), [filtrados]);
  const inactivos = useMemo(() => filtrados.filter((c) => !c.activo), [filtrados]);

  return (
    <div className="space-y-8">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Badge tone="ok">Activos: {activos.length}</Badge>
          <Badge tone="danger">Inactivos: {inactivos.length}</Badge>
          <Badge>Total: {clientes.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono…"
            className="w-80 rounded-lg bg-neutral-800/70 px-3 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
          />
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/5"
          >
            {loading ? "…" : "Refrescar"}
          </button>
        </div>
      </div>

      {/* Dos columnas: Activos e Inactivos (menos scroll, claro y directo) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activos */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Activos</h2>
            <span className="text-xs text-neutral-400">Alfabético</span>
          </div>
          {activos.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-400 text-sm">
              No hay clientes activos.
            </div>
          ) : (
            activos.map((c) => (
              <ClienteCard key={c.id} c={c} onToggle={toggle} onDelete={remove} onUpdate={update} />
            ))
          )}
        </section>

        {/* Inactivos */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Inactivos</h2>
            <span className="text-xs text-neutral-400">Para eliminar, primero sin dependencias</span>
          </div>
          {inactivos.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-400 text-sm">
              No hay clientes inactivos.
            </div>
          ) : (
            inactivos.map((c) => (
              <ClienteCard key={c.id} c={c} onToggle={toggle} onDelete={remove} onUpdate={update} />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
