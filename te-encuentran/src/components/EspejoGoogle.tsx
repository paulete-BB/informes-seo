import { AnalisisCRO, AnalisisPageSpeed, AnalisisTecnico, EstadoSemaforo } from "@/lib/tipos";
import TarjetaAnalisis from "./TarjetaAnalisis";
import Semaforo from "./Semaforo";
import Puntaje from "./Puntaje";

const ORDEN_URGENCIA: Record<EstadoSemaforo, number> = {
  critico: 0,
  alerta: 1,
  ok: 2,
};

export default function EspejoGoogle({
  tecnico,
  cargandoTecnico,
  pagespeed,
  cargandoPagespeed,
  cro,
}: {
  tecnico: AnalisisTecnico | null;
  cargandoTecnico: boolean;
  pagespeed: AnalisisPageSpeed | null;
  cargandoPagespeed: boolean;
  cro: AnalisisCRO;
}) {
  const hallazgosOrdenados = [...(tecnico?.hallazgos ?? [])].sort(
    (a, b) => ORDEN_URGENCIA[a.estado] - ORDEN_URGENCIA[b.estado]
  );

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

      <TarjetaAnalisis
        titulo="Estructura técnica"
        cargando={cargandoTecnico}
        error={tecnico?.ok === false ? tecnico.error : undefined}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {hallazgosOrdenados.map((h) => (
            <div
              key={h.id}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <span className="text-sm font-bold text-zinc-800">
                {h.titulo}
              </span>
              <Semaforo estado={h.estado} />
              <p className="line-clamp-3 text-sm text-zinc-600">
                {h.explicacion}
              </p>
            </div>
          ))}
        </div>
      </TarjetaAnalisis>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <TarjetaAnalisis
          titulo="Velocidad (PageSpeed)"
          cargando={cargandoPagespeed}
          error={pagespeed?.ok === false ? pagespeed.error : undefined}
        >
          {pagespeed?.ok && (
            <>
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
            </>
          )}
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
