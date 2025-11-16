// app/admin/rutas/page.tsx
import RutasBoard from "@/components/admin/rutas/RutasBoard";

export const dynamic = "force-dynamic";

export default function RutasPage() {
  return (
    <div className="mx-auto max-w-7xl px-3 md:px-4 lg:px-6">
      <div className="sticky top-[64px] z-10 -mx-3 mb-5 bg-[#0b0b10]/70 px-3 py-3 backdrop-blur md:-mx-4 md:px-4 lg:-mx-6 lg:px-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 ring-1 ring-white/15" />
          <div>
            <h1 className="text-lg font-semibold tracking-wide">Rutas (hoy)</h1>
            <p className="text-xs text-neutral-400">Planificadas, en curso y completadas. Progreso por paradas.</p>
          </div>
        </div>
      </div>

      <RutasBoard />
    </div>
  );
}
