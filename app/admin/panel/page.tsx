"use client";
import Link from "next/link";

export default function AdminPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel</h1>
        <p className="text-sm text-zinc-400">Accesos rapidos del administrador.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/admin/asignaciones"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 hover:border-emerald-400/70"
        >
          <div className="text-sm text-emerald-300 mb-1">Asignaciones</div>
          <div className="text-zinc-100 text-base">Asignar pedidos a repartidores</div>
        </Link>

        <Link
          href="/admin/entregas"
          className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 hover:border-blue-400/70"
        >
          <div className="text-sm text-blue-300 mb-1">Entregas</div>
          <div className="text-zinc-100 text-base">Ver pendientes / completos / incompletos</div>
        </Link>

        <Link
          href="/admin/pedidos"
          className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 hover:border-zinc-500"
        >
          <div className="text-sm text-zinc-300 mb-1">Pedidos</div>
          <div className="text-zinc-100 text-base">Listado general</div>
        </Link>
      </div>
    </div>
  );
}
