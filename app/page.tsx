import Link from "next/link";

export default function PantallaPrincipal() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-10">
        <div className="w-full space-y-8">
          <div className="space-y-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400">
              Oquedal Logistics
            </p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Empresa enfocada en mover tus pedidos de forma ordenada
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-neutral-300 sm:text-base">
              Somos una empresa de logistica que conecta clientes, administradores y repartidores
              en una sola plataforma. La idea es simple: cada envio tiene punto de salida, punto de llegada
              y un estado claro en todo momento.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-3xl bg-neutral-900/90 p-5 shadow-lg ring-1 ring-neutral-800">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  Quienes somos
                </p>
                <p className="text-sm text-neutral-200">
                  Empresa dedicada a organizar entregas locales y foraneas. Tomamos todos los pedidos del dia
                  y los convertimos en rutas claras para tus unidades y tu equipo.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-400">
                  <li>- Menos llamadas para preguntar por un pedido</li>
                  <li>- Cada envio tiene registro de horario y estatus</li>
                  <li>- Se ve que se entrego y que quedo pendiente</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl bg-neutral-900/90 p-5 shadow-lg ring-1 ring-neutral-800">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  Como trabajamos
                </p>
                <div className="space-y-2 text-sm text-neutral-200">
                  <div className="flex gap-3">
                    <span className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full bg-emerald-500 text-center text-xs font-bold text-neutral-950">
                      1
                    </span>
                    <p>
                      El cliente registra su pedido con origen, destino y horario.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full bg-emerald-400 text-center text-xs font-bold text-neutral-950">
                      2
                    </span>
                    <p>
                      El administrador acomoda los pedidos en el dia y arma las rutas.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full bg-emerald-300 text-center text-xs font-bold text-neutral-950">
                      3
                    </span>
                    <p>
                      El repartidor sigue la ruta y actualiza el estado de cada entrega.
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-neutral-400">
                  Todo queda guardado para revisar despues como se movio el dia.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl bg-neutral-900/90 p-5 shadow-lg ring-1 ring-neutral-800">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  Entrar a la aplicacion
                </p>
                <p className="text-sm text-neutral-200">
                  Elige el rol con el que vas a trabajar hoy. Cada rol ve solo lo que le toca.
                </p>

                <div className="mt-3 space-y-2">
                  <Link
                    href="/admin/pedidos"
                    className="block rounded-2xl bg-emerald-500 px-4 py-2 text-center text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
                  >
                    Entrar como administrador
                  </Link>
                  <Link
                    href="/repartidor/pedidos"
                    className="block rounded-2xl bg-neutral-800 px-4 py-2 text-center text-sm font-semibold text-neutral-50 transition hover:bg-neutral-700"
                  >
                    Entrar como repartidor
                  </Link>
                  <Link
                    href="/cliente/pedidos"
                    className="block rounded-2xl border border-neutral-700 px-4 py-2 text-center text-sm font-semibold text-neutral-100 transition hover:border-emerald-400"
                  >
                    Entrar como cliente
                  </Link>
                </div>

                <div className="mt-3 space-y-1 text-xs text-neutral-400">
                  <p>- Admin: ve el mapa completo del dia.</p>
                  <p>- Repartidor: solo sus entregas de hoy.</p>
                  <p>- Cliente: solo sus propios pedidos.</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-neutral-500">
            Resumen: somos una empresa de logistica que usa esta plataforma para que tus entregas
            no dependan de mensajes sueltos, sino de un sistema claro y medible.
          </p>
        </div>
      </div>
    </main>
  );
}
