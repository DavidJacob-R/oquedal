"use client";
import { useEffect, useState } from "react";

type Pedido = {
  id: string;
  tipo: "mudanza" | "envio";
  fecha: string;
  franja_horaria: string | null;
  origen_direccion: string;
  origen_ciudad: string | null;
  origen_estado: string | null;
  origen_cp: string | null;
  destino_direccion: string;
  destino_ciudad: string | null;
  destino_estado: string | null;
  destino_cp: string | null;
  contacto_nombre: string;
  contacto_tel: string;
  descripcion: string | null;
  volumen_m3: number | null;
  peso_kg: number | null;
  estado: string;
};

const inputBase = "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2";
const cardBase  = "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3";

export default function MiPanelPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Pedido>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem("usuario_id");
      setUid(u || null);
    } catch {
      setUid(null);
    }
  }, []);

  async function headers() {
    const h: Record<string, string> = {};
    if (uid) h["x-usuario-id"] = uid;
    return h;
  }

  async function load() {
    if (!uid) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/pedidos?estado=pendiente`, {
        headers: await headers(),
        cache: "no-store",
      });
      const data = await r.json().catch(() => []);
      if (!r.ok) throw new Error(data?.error || "no_ok");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr("No se pudieron cargar tus pedidos");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [uid]);

  function startEdit(p: Pedido) {
    setEditId(p.id);
    setEdit({
      ...p,
      fecha: p.fecha?.slice(0, 10),
    });
  }

  async function saveEdit() {
    if (!editId) return;
    try {
      const r = await fetch(`/api/pedidos/${editId}`, {
        method: "PUT",
        headers: { "content-type": "application/json", ...(await headers()) },
        body: JSON.stringify(edit),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(data?.error === "no_permitido" ? "Solo puedes editar pedidos pendientes tuyos" : "No se pudo guardar");
        return;
      }
      setEditId(null);
      setEdit({});
      await load();
    } catch {
      alert("No se pudo guardar");
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar pedido pendiente?")) return;
    try {
      const r = await fetch(`/api/pedidos/${id}`, { method: "DELETE", headers: await headers() });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(data?.error || "No se pudo eliminar");
        return;
      }
      await load();
    } catch {
      alert("No se pudo eliminar");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mi panel</h1>
        <button
          onClick={load}
          disabled={loading || !uid}
          className="px-3 py-1 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-violet-500/60 disabled:opacity-50"
        >
          Recargar
        </button>
      </div>

      {!uid && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
          No hay sesión. Inicia sesión para ver tus pedidos.
        </div>
      )}

      <div className="text-xs text-zinc-500">
        {/* debug útil: */}
        uid: <span className="font-mono">{uid || "—"}</span> · pedidos: <span className="font-mono">{items.length}</span>
      </div>

      {err && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</div>}

      {!loading && uid && items.length === 0 && !err && (
        <div className="text-sm text-zinc-500">No tienes pedidos pendientes.</div>
      )}

      <ul className="grid gap-2">
        {items.map((p) => (
          <li key={p.id} className={cardBase}>
            {editId === p.id ? (
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400">Tipo</label>
                  <select
                    value={(edit.tipo as any) ?? "mudanza"}
                    onChange={(e) => setEdit((x) => ({ ...x, tipo: e.target.value as any }))}
                    className={inputBase}
                  >
                    <option value="mudanza">mudanza</option>
                    <option value="envio">envio</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Fecha</label>
                  <input
                    type="date"
                    value={(edit.fecha as any) ?? ""}
                    onChange={(e) => setEdit((x) => ({ ...x, fecha: e.target.value }))}
                    className={inputBase}
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    placeholder="Franja"
                    value={(edit.franja_horaria as any) ?? ""}
                    onChange={(e) => setEdit((x) => ({ ...x, franja_horaria: e.target.value }))}
                    className={inputBase}
                  />
                </div>

                <div className="sm:col-span-2 font-semibold">Origen</div>
                <div className="sm:col-span-2">
                  <input
                    placeholder="Dirección"
                    value={(edit.origen_direccion as any) ?? ""}
                    onChange={(e) => setEdit((x) => ({ ...x, origen_direccion: e.target.value }))}
                    className={inputBase}
                  />
                </div>
                <div><input placeholder="Ciudad" value={(edit.origen_ciudad as any) ?? ""} onChange={(e) => setEdit((x) => ({ ...x, origen_ciudad: e.target.value }))} className={inputBase} /></div>
                <div><input placeholder="Estado" value={(edit.origen_estado as any) ?? ""} onChange={(e) => setEdit((x) => ({ ...x, origen_estado: e.target.value }))} className={inputBase} /></div>
                <div><input placeholder="CP" value={(edit.origen_cp as any) ?? ""} onChange={(e) => setEdit((x) => ({ ...x, origen_cp: e.target.value }))} className={inputBase} /></div>

                <div className="sm:col-span-2 font-semibold">Destino</div>
                <div className="sm:col-span-2">
                  <input
                    placeholder="Dirección"
                    value={(edit.destino_direccion as any) ?? ""}
                    onChange={(e) => setEdit((x) => ({ ...x, destino_direccion: e.target.value }))}
                    className={inputBase}
                  />
                </div>
                <div><input placeholder="Ciudad" value={(edit.destino_ciudad as any) ?? ""} onChange={(e) => setEdit((x) => ({ ...x, destino_ciudad: e.target.value }))} className={inputBase} /></div>
                <div><input placeholder="Estado" value={(edit.destino_estado as any) ?? ""} onChange={(e) => setEdit((x) => ({ ...x, destino_estado: e.target.value }))} className={inputBase} /></div>
                <div><input placeholder="CP" value={(edit.destino_cp as any) ?? ""} onChange={(e) => setEdit((x) => ({ ...x, destino_cp: e.target.value }))} className={inputBase} /></div>

                <div><input placeholder="Contacto nombre" value={(edit.contacto_nombre as any) ?? ""} onChange={(e) => setEdit((x) => ({ ...x, contacto_nombre: e.target.value }))} className={inputBase} /></div>
                <div><input placeholder="Contacto tel" value={(edit.contacto_tel as any) ?? ""} onChange={(e) => setEdit((x) => ({ ...x, contacto_tel: e.target.value }))} className={inputBase} /></div>

                <div className="sm:col-span-2">
                  <textarea
                    placeholder="Descripción"
                    value={(edit.descripcion as any) ?? ""}
                    onChange={(e) => setEdit((x) => ({ ...x, descripcion: e.target.value }))}
                    className={inputBase}
                    rows={2}
                  />
                </div>

                <div><input type="number" step="any" placeholder="Volumen m³" value={(edit.volumen_m3 as any) ?? ""} onChange={(e) => setEdit((x) => ({ ...x, volumen_m3: e.target.value === "" ? null : Number(e.target.value) }))} className={inputBase} /></div>
                <div><input type="number" step="any" placeholder="Peso kg" value={(edit.peso_kg as any) ?? ""} onChange={(e) => setEdit((x) => ({ ...x, peso_kg: e.target.value === "" ? null : Number(e.target.value) }))} className={inputBase} /></div>

                <div className="sm:col-span-2 flex gap-2">
                  <button type="button" onClick={saveEdit} className="rounded-xl px-3 py-2 bg-white text-black">Guardar</button>
                  <button type="button" onClick={() => { setEditId(null); setEdit({}); }} className="rounded-xl px-3 py-2 border border-zinc-800 bg-zinc-900 hover:border-violet-500/60">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1">
                  <div className="font-medium">
                    {p.tipo} — {p.fecha?.slice(0, 10)} — {p.franja_horaria || "sin franja"} — <span className="text-xs text-yellow-300">{p.estado}</span>
                  </div>
                  <div className="text-sm text-zinc-400">
                    Origen: {p.origen_direccion}{p.origen_ciudad ? `, ${p.origen_ciudad}` : ""}{p.origen_estado ? `, ${p.origen_estado}` : ""}{p.origen_cp ? `, CP ${p.origen_cp}` : ""}
                  </div>
                  <div className="text-sm text-zinc-400">
                    Destino: {p.destino_direccion}{p.destino_ciudad ? `, ${p.destino_ciudad}` : ""}{p.destino_estado ? `, ${p.destino_estado}` : ""}{p.destino_cp ? `, CP ${p.destino_cp}` : ""}
                  </div>
                  <div className="text-sm">Contacto: {p.contacto_nombre} — {p.contacto_tel}</div>
                  {p.descripcion && <div className="text-sm text-zinc-300">Notas: {p.descripcion}</div>}
                  <div className="text-xs text-zinc-500">
                    Vol: {p.volumen_m3 ?? "-"} m³ · Peso: {p.peso_kg ?? "-"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(p)} className="rounded-xl px-3 py-2 border border-zinc-800 bg-zinc-900 hover:border-violet-500/60">Editar</button>
                  <button onClick={() => remove(p.id)} className="rounded-xl px-3 py-2 bg-red-600 text-white">Eliminar</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
