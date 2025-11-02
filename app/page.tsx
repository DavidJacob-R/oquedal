import Link from "next/link";

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-2xl font-semibold text-zinc-100">{v}</div>
      <div className="text-sm text-zinc-400">{k}</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="grid gap-10">
      {/* hero */}
      <section className="grid gap-6 md:grid-cols-2 items-center">
        <div className="grid gap-4">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            logística moderna para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              mudanzas y envíos
            </span>
          </h1>
          <p className="text-zinc-400">
            En <b>oquedal logística</b> movemos paquetes, muebles y mudanzas a nivel nacional.
            Seguimiento claro, ventanas de horario flexibles y trato profesional.
          </p>
          <div className="flex gap-3">
            <Link
              href="/cliente/pedidos"
              className="inline-flex items-center rounded-xl px-5 py-2.5 font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
            >
              Ir al panel
            </Link>
            <a
              href="#servicios"
              className="inline-flex items-center rounded-xl px-5 py-2.5 font-medium border border-zinc-800 bg-zinc-900 hover:border-violet-500/50"
            >
              Ver servicios
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
          <div className="grid gap-3">
            <div className="text-sm text-zinc-400">¿Por qué elegirnos?</div>
            <ul className="grid gap-2 text-sm">
              <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-violet-400" /> Cobertura nacional y rutas optimizadas</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-violet-400" /> Manejo de muebles y voluminosos</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-violet-400" /> Ventanas de horario flexibles</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-violet-400" /> Soporte humano 24/7</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-violet-400" /> Cotización clara y sin sorpresas</li>
            </ul>
          </div>
        </div>
      </section>

      {/* stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat k="Entregas en el último año" v="12,400+" />
        <Stat k="Satisfacción de clientes" v="98%" />
        <Stat k="Unidades en ruta" v="80+" />
      </section>

      {/* servicios */}
      <section id="servicios" className="grid gap-6">
        <h2 className="text-xl font-semibold">Servicios</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { t: "Mudanzas residenciales", d: "Desde estudio hasta casa completa. Embalaje y desmontaje opcional." },
            { t: "Envío de paquetes y pallets", d: "Puerta a puerta para cajas, paquetes y tarimas. Multi-destino." },
            { t: "Muebles y voluminosos", d: "Manejo especial de muebles, electrodomésticos y obras." },
          ].map((s) => (
            <div key={s.t} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="mb-1 text-violet-300 text-sm">oquedal</div>
              <div className="text-lg font-semibold">{s.t}</div>
              <p className="text-sm text-zinc-400 mt-1">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* proceso */}
      <section className="grid gap-6">
        <h2 className="text-xl font-semibold">¿Cómo funciona?</h2>
        <ol className="grid gap-3 md:grid-cols-4">
          {["Crea tu pedido", "Programa fecha y franja", "Asignamos unidad", "Seguimiento y entrega"].map((p, i) => (
            <li key={p} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="text-sm text-zinc-400">Paso {i + 1}</div>
              <div className="font-medium">{p}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* cta */}
      <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 p-6">
        <div className="grid gap-4 md:grid-cols-2 md:items-center">
          <div>
            <div className="text-sm text-violet-300">¿Listo para mover?</div>
            <h3 className="text-2xl font-semibold">Agenda tu servicio hoy</h3>
            <p className="text-sm text-zinc-400">Levanta tu pedido en menos de 2 minutos.</p>
          </div>
          <div className="md:justify-self-end">
            <Link
              href="/cliente/pedidos"
              className="inline-flex items-center rounded-xl px-5 py-2.5 font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
            >
              Ir al panel
            </Link>
          </div>
        </div>
      </section>

      <footer className="pt-6 text-xs text-zinc-500">
        © {new Date().getFullYear()} oquedal logística — todos los derechos reservados
      </footer>
    </div>
  );
}
