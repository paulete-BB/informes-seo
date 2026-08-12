import { AnalisisCRO, AnalisisPageSpeed, AnalisisTecnico } from "@/lib/tipos";
import TarjetaAnalisis from "./TarjetaAnalisis";
import Semaforo from "./Semaforo";
import Puntaje from "./Puntaje";

export default function EspejoGoogle({
  tecnico,
  pagespeed,
  cro,
}: {
  tecnico: AnalisisTecnico;
  pagespeed: AnalisisPageSpeed;
  cro: AnalisisCRO;
}) {
  return (
    <section>
      <div className="mb-6">
        <span className="text-sm font-bold uppercase tracking-wide text-sky-700">
          Espejo 1
        </span>
        <h2 className="text-3xl font-extrabold text-zinc-900 sm:text-4xl">
          Cómo te ve Google
        </h2>
        <p className="mt-2 max-w-2xl text-lg text-zinc-600">
          Velocidad, estructura técnica y si tu web da confianza y convierte
          visitas en clientes.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <TarjetaAnalisis titulo="Estructura técnica" error={tecnico.error}>
          <ul className="space-y-4">
            {tecnico.hallazgos.map((h) => (
              <li key={h.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base font-semibold text-zinc-800">
                    {h.titulo}
                  </span>
                  <Semaforo estado={h.estado} />
                </div>
                <p className="text-base text-zinc-600">{h.explicacion}</p>
              </li>
            ))}
          </ul>
        </TarjetaAnalisis>

        <TarjetaAnalisis titulo="Velocidad (PageSpeed)" error={pagespeed.error}>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <Puntaje etiqueta="Velocidad" valor={pagespeed.scorePerformance} />
            <Puntaje etiqueta="SEO" valor={pagespeed.scoreSeo} />
            <Puntaje etiqueta="Accesibilidad" valor={pagespeed.scoreAccesibilidad} />
          </div>
          <ul className="space-y-4">
            {pagespeed.metricas.map((m) => (
              <li key={m.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base font-semibold text-zinc-800">
                    {m.nombre}{" "}
                    <span className="font-normal text-zinc-500">
                      ({m.valor})
                    </span>
                  </span>
                  <Semaforo estado={m.estado} />
                </div>
                <p className="text-base text-zinc-600">{m.explicacion}</p>
              </li>
            ))}
          </ul>
        </TarjetaAnalisis>

        <TarjetaAnalisis
          titulo="Primera impresión (visual)"
          error={cro.error}
        >
          <div className="space-y-5">
            {cro.dimensiones.map((d) => (
              <div key={d.nombre}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base font-semibold text-zinc-800">
                    {d.nombre}
                  </span>
                  <span className="text-lg font-bold text-zinc-700">
                    {d.score}/100
                  </span>
                </div>
                <p className="mb-2 text-base text-zinc-600">{d.veredicto}</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-zinc-500">
                  {d.hallazgos.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </TarjetaAnalisis>
      </div>
    </section>
  );
}
