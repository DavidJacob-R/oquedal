// app/admin/empleados/page.tsx
import EmpleadosBoard from "@/components/admin/empleados/EmpleadosBoard";

export const dynamic = "force-dynamic";

export default function EmpleadosPage() {
  return (
    <div className="mx-auto max-w-7xl px-3 md:px-4 lg:px-6">
      <div className="sticky top-[64px] z-10 -mx-3 mb-5 bg-[#0b0b10]/70 px-3 py-3 backdrop-blur md:-mx-4 md:px-4 lg:-mx-6 lg:px-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 ring-1 ring-white/15" />
          <div>
            <h1 className="text-lg font-semibold tracking-wide">Empleados</h1>
            <p className="text-xs text-neutral-400">
              Repartidores (con licencia) y Ayudantes. Asignaciones rápidas (máx. 3 por repartidor).
            </p>
          </div>
        </div>
      </div>

      <EmpleadosBoard />
    </div>
  );
}
