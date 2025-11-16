// components/admin/empleados/EmpleadosBoard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Repartidor = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  licencia: string | null;
  conductor_activo: boolean | null;
  ayudantes_asignados: number;
};
type Ayudante = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  repartidor_id: string | null;
  repartidor_nombre: string | null;
};

function Chip({
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

export default function EmpleadosBoard() {
  const [loading, setLoading] = useState(false);
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [ayudantes, setAyudantes] = useState<Ayudante[]>([]);
  const [q, setQ] = useState("");

  // Crear empleado
  const [crearOpen, setCrearOpen] = useState(false);
  const [tipo, setTipo] = useState<"repartidor" | "ayudante">("repartidor");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pass, setPass] = useState("");
  const [licencia, setLicencia] = useState("");

  const libres = useMemo(
    () => ayudantes.filter((a) => !a.repartidor_id && a.activo),
    [ayudantes]
  );

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/empleados/list", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || "Error");
      setRepartidores(j.repartidores || []);
      setAyudantes(j.ayudantes || []);
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar los empleados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const s = q.trim().toLowerCase();
  const repFiltrados = useMemo(() => {
    if (!s) return repartidores;
    return repartidores.filter(
      (r) =>
        (r.nombre || "").toLowerCase().includes(s) ||
        (r.email || "").toLowerCase().includes(s) ||
        (r.telefono || "").toLowerCase().includes(s)
    );
  }, [repartidores, s]);

  const ayuFiltrados = useMemo(() => {
    if (!s) return ayudantes;
    return ayudantes.filter(
      (a) =>
        (a.nombre || "").toLowerCase().includes(s) ||
        (a.email || "").toLowerCase().includes(s) ||
        (a.telefono || "").toLowerCase().includes(s) ||
        (a.repartidor_nombre || "").toLowerCase().includes(s)
    );
  }, [ayudantes, s]);

  async function toggle(id: string) {
    const res = await fetch("/api/admin/empleados/toggle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert(j?.error || "No se pudo cambiar el estado.");
    // actualizar local (pueden ser rep o ayu)
    setRepartidores((prev) => prev.map((x) => (x.id === id ? { ...x, activo: !!j.activo } : x)));
    setAyudantes((prev) => prev.map((x) => (x.id === id ? { ...x, activo: !!j.activo } : x)));
  }

  async function assign(repartidorId: string, ayudanteId: string) {
    const res = await fetch("/api/admin/empleados/assign-helper", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repartidorId, ayudanteId }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert(j?.error || "No se pudo asignar.");
    await refresh();
  }

  async function unassign(ayudanteId: string) {
    const res = await fetch("/api/admin/empleados/unassign-helper", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ayudanteId }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert(j?.error || "No se pudo desasignar.");
    await refresh();
  }

  async function crearEmpleado() {
    if (!nombre.trim() || !email.trim()) {
      alert("Nombre y email son requeridos.");
      return;
    }
    if (tipo === "repartidor" && !licencia.trim()) {
      alert("La licencia es requerida para repartidor.");
      return;
    }
    const payload: any = { tipo, nombre: nombre.trim(), email: email.trim(), telefono: telefono.trim() || null };
    if (pass.trim()) payload.pass = pass.trim();
    if (tipo === "repartidor") payload.licencia = licencia.trim();

    const res = await fetch("/api/admin/empleados/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert(j?.error || "No se pudo crear el empleado.");
    setCrearOpen(false);
    setNombre(""); setEmail(""); setTelefono(""); setPass(""); setLicencia("");
    await refresh();
  }

  return (
    <div className="space-y-8">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Chip tone="ok">Repartidores: {repartidores.length}</Chip>
          <Chip tone="default">Ayudantes: {ayudantes.length}</Chip>
          <Chip>Libres: {libres.length}</Chip>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono o asignación…"
            className="w-96 rounded-lg bg-neutral-800/70 px-3 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
          />
          <button
            onClick={() => setCrearOpen((x) => !x)}
            className="rounded-lg bg-orange-500/20 px-3 py-1.5 text-sm text-orange-200 ring-1 ring-orange-500/30 hover:bg-orange-500/25"
          >
            {crearOpen ? "Cerrar" : "Nuevo empleado"}
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/5"
          >
            {loading ? "…" : "Refrescar"}
          </button>
        </div>
      </div>

      {/* Form crear */}
      {crearOpen && (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-4 ring-1 ring-black/30">
          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <label className="text-[11px] text-neutral-400">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as "repartidor" | "ayudante")}
                className="mt-1 w-full rounded-lg bg-neutral-800/70 px-2 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
              >
                <option value="repartidor">Repartidor</option>
                <option value="ayudante">Ayudante</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-neutral-400">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
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
            <div>
              <label className="text-[11px] text-neutral-400">Teléfono</label>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="mt-1 w-full rounded-lg bg-neutral-800/70 px-2 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
              />
            </div>
            <div>
              <label className="text-[11px] text-neutral-400">Contraseña (opcional)</label>
              <input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="mt-1 w-full rounded-lg bg-neutral-800/70 px-2 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
              />
            </div>
            {tipo === "repartidor" && (
              <div className="md:col-span-5">
                <label className="text-[11px] text-neutral-400">Licencia (requerida)</label>
                <input
                  value={licencia}
                  onChange={(e) => setLicencia(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-neutral-800/70 px-2 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
                />
              </div>
            )}
          </div>
          <div className="mt-3 text-right">
            <button
              onClick={crearEmpleado}
              className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
            >
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Grid 2 columnas: Repartidores y Ayudantes */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Repartidores */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Repartidores</h2>
            <span className="text-xs text-neutral-400">Asignación de ayudantes (máx. 3)</span>
          </div>

          {repFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-400 text-sm">
              No hay repartidores.
            </div>
          ) : (
            repFiltrados.map((r) => (
              <article key={r.id} className="rounded-2xl border border-white/10 bg-neutral-950/40 p-4 ring-1 ring-black/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-[15px] font-medium text-neutral-100 truncate">{r.nombre}</div>
                      {r.activo ? <Chip tone="ok">Activo</Chip> : <Chip tone="danger">Inactivo</Chip>}
                    </div>
                    <div className="text-[12px] text-neutral-400">
                      Email: <span className="text-neutral-300">{r.email ?? "—"}</span> • Tel: <span className="text-neutral-300">{r.telefono ?? "—"}</span>
                    </div>
                    <div className="text-[12px] text-neutral-400">
                      Licencia: <span className="text-neutral-200">{r.licencia ?? "—"}</span>
                    </div>
                    <div className="text-[12px] text-neutral-400">
                      Ayudantes asignados: <span className="text-neutral-200">{r.ayudantes_asignados}/3</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => toggle(r.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs ring-1 ${
                        r.activo
                          ? "bg-amber-500/15 text-amber-200 ring-amber-500/30 hover:bg-amber-500/25"
                          : "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30 hover:bg-emerald-500/25"
                      }`}
                    >
                      {r.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>

                {/* Asignar ayudante */}
                <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                  <select
                    disabled={r.ayudantes_asignados >= 3 || libres.length === 0}
                    onChange={(e) => {
                      const aid = e.target.value;
                      if (!aid) return;
                      assign(r.id, aid);
                      e.currentTarget.selectedIndex = 0; // reset
                    }}
                    className="rounded-lg bg-neutral-800/70 px-2 py-1.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-white/20"
                  >
                    <option value="">
                      {r.ayudantes_asignados >= 3
                        ? "Tope alcanzado (3/3)"
                        : libres.length === 0
                        ? "No hay ayudantes libres"
                        : "Asignar ayudante…"}
                    </option>
                    {libres.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} — {a.email ?? "sin email"}
                      </option>
                    ))}
                  </select>
                  <span className="text-[12px] text-neutral-400 self-center">
                    Selecciona para asignar (se agrega al instante).
                  </span>
                </div>
              </article>
            ))
          )}
        </section>

        {/* Ayudantes */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Ayudantes</h2>
            <span className="text-xs text-neutral-400">Un ayudante ⇢ un repartidor</span>
          </div>

          {ayuFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-6 text-neutral-400 text-sm">
              No hay ayudantes.
            </div>
          ) : (
            ayuFiltrados.map((a) => (
              <article key={a.id} className="rounded-2xl border border-white/10 bg-neutral-950/40 p-4 ring-1 ring-black/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-[15px] font-medium text-neutral-100 truncate">{a.nombre}</div>
                      {a.activo ? <Chip tone="ok">Activo</Chip> : <Chip tone="danger">Inactivo</Chip>}
                    </div>
                    <div className="text-[12px] text-neutral-400">
                      Email: <span className="text-neutral-300">{a.email ?? "—"}</span> • Tel: <span className="text-neutral-300">{a.telefono ?? "—"}</span>
                    </div>
                    <div className="text-[12px] text-neutral-400">
                      Asignado a:{" "}
                      <span className="text-neutral-200">{a.repartidor_nombre ? a.repartidor_nombre : "— (libre)"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => toggle(a.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs ring-1 ${
                        a.activo
                          ? "bg-amber-500/15 text-amber-200 ring-amber-500/30 hover:bg-amber-500/25"
                          : "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30 hover:bg-emerald-500/25"
                      }`}
                    >
                      {a.activo ? "Desactivar" : "Activar"}
                    </button>
                    {a.repartidor_id && (
                      <button
                        onClick={() => unassign(a.id)}
                        className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-neutral-200 ring-1 ring-white/10 hover:bg-white/10"
                      >
                        Desasignar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
