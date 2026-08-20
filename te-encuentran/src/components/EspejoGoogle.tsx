import { AnalisisCRO, AnalisisPageSpeed, AnalisisTecnico, EstadoSemaforo } from "@/lib/tipos";
import { promedio } from "@/lib/puntajes";
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
  onReintentarTecnico,
  pagespeed,
  cargandoPagespeed,
  onReintentarPagespeed,
  cro,
  cargandoCro,
  onReintentarCro,
}: {
  tecnico: AnalisisTecnico | null;
  cargandoTecnico: boolean;
  onReintentarTecnico: () => void;
  pagespeed: AnalisisPageSpeed | null;
  cargandoPagespeed: boolean;
  onReintentarPagespeed: () => void;
  cro: AnalisisCRO | null;
  cargandoCro: boolean;
  onReintentarCro: () => void;
}) {
  const hallazgosOrdenados = [...(tecnico?.hallazgos ?? [])].sort(
    (a, b) => ORDEN_URGENCIA[a.estado] - ORDEN_URGENCIA[b.estado]
  );

  return (
    <section>
      <div className="imprimir-titulo mb-6">
        <span className="text-sm font-bold uppercase tracking-wide text-marca-purpura">
          Espejo 1
        </span>
        <h2 className="font-display text-3xl font-extrabold text-zinc-900 sm:text-4xl">
          Cómo te ve Google
        </h2>
        <p className="mt-2 max-w-2xl text-lg text-zinc-600">
          Velocidad, estructura técnica y si tu web da confianza y convierte
          visitas en clientes.
        </p>
      </div>

      <TarjetaAnalisis
        titulo="Estructura técnica"
        puntaje={tecnico?.ok ? tecnico.score : undefined}
        cargando={cargandoTecnico}
        error={tecnico?.ok === false ? tecnico.error : undefined}
        onReintentar={onReintentarTecnico}
      >
        {tecnico?.ok && (
          <p className="imprimir-bloque mb-4 text-sm text-zinc-500">
            Plataforma detectada:{" "}
            <span className="font-semibold text-zinc-700">
              {tecnico.plataforma?.nombre ?? "no identificada"}
            </span>
            {tecnico.plataforma && (
              <span className="text-zinc-400"> · {tecnico.plataforma.detalle}</span>
            )}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {hallazgosOrdenados.map((h) => (
            <div
              key={h.id}
              className="imprimir-bloque flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
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
          puntaje={
            pagespeed?.ok
              ? promedio([pagespeed.scorePerformance, pagespeed.scoreSeo, pagespeed.scoreAccesibilidad])
              : undefined
          }
          cargando={cargandoPagespeed}
          error={pagespeed?.ok === false ? pagespeed.error : undefined}
          onReintentar={onReintentarPagespeed}
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
                  <li key={m.id} className="imprimir-bloque flex flex-col gap-2">
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
          puntaje={cro?.ok ? promedio(cro.dimensiones.map((d) => d.score)) : undefined}
          cargando={cargandoCro}
          error={cro?.ok === false ? cro.error : undefined}
          onReintentar={onReintentarCro}
        >
          {cro?.ok && (
            <div className="space-y-5">
              {cro.dimensiones.map((d) => (
                <div key={d.nombre} className="imprimir-bloque">
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
          )}
        </TarjetaAnalisis>
      </div>
    </section>
  );
}
