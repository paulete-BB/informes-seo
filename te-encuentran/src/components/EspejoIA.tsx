import { AnalisisVisibilidadIA } from "@/lib/tipos";
import TarjetaAnalisis from "./TarjetaAnalisis";

export default function EspejoIA({
  visibilidad,
  cargando,
  onReintentar,
}: {
  visibilidad: AnalisisVisibilidadIA | null;
  cargando: boolean;
  onReintentar: () => void;
}) {
  const maxMenciones = Math.max(
    1,
    ...(visibilidad?.competidores.map((c) => c.vecesMencionado) ?? [])
  );
  const error = visibilidad?.ok === false ? visibilidad.error : undefined;

  return (
    <section>
      <div className="imprimir-titulo mb-6">
        <span className="text-sm font-bold uppercase tracking-wide text-marca-magenta">
          Espejo 2
        </span>
        <h2 className="font-display text-3xl font-extrabold text-zinc-900 sm:text-4xl">
          Cómo te ve la IA
        </h2>
        <p className="mt-2 max-w-2xl text-lg text-zinc-600">
          Si la IA te recomienda cuando alguien busca lo que vendes,
          probado con búsquedas reales y actuales en internet, y a quién
          recomienda en tu lugar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <TarjetaAnalisis
          titulo="Preguntas reales, probadas en vivo"
          puntaje={
            visibilidad?.ok && visibilidad.totalPreguntas > 0
              ? Math.round((visibilidad.scoreVisibilidad / visibilidad.totalPreguntas) * 100)
              : undefined
          }
          cargando={cargando}
          error={error}
          onReintentar={onReintentar}
          partibleAlImprimir
        >
          {visibilidad?.ok && (
            <>
              <div className="mb-3 flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-red-600">
                  {visibilidad.scoreVisibilidad}/{visibilidad.totalPreguntas}
                </span>
                <span className="text-base text-zinc-600">
                  veces que la IA te mencionó al responder
                </span>
              </div>
              <ol className="space-y-3">
                {visibilidad.preguntas.map((p, i) => (
                  <li
                    key={i}
                    className="imprimir-bloque flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        p.apareceNegocio
                          ? "bg-emerald-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {p.apareceNegocio ? "✓" : "✕"}
                    </span>
                    <span className="text-base text-zinc-700">
                      &ldquo;{p.pregunta}&rdquo;
                      {p.apareceNegocio && p.posicion && (
                        <span className="ml-2 text-sm font-semibold text-emerald-700">
                          (apareciste en el puesto {p.posicion})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </TarjetaAnalisis>

        <div className="flex flex-col gap-6">
          <TarjetaAnalisis
            titulo="Quién aparece en tu lugar"
            cargando={cargando}
            error={error}
            onReintentar={onReintentar}
          >
            {visibilidad?.ok && (
              <ul className="space-y-4">
                {visibilidad.competidores.map((c) => (
                  <li key={c.nombre} className="imprimir-bloque">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-base font-semibold text-zinc-800">
                        {c.nombre}
                      </span>
                      <span className="text-base font-bold text-zinc-700">
                        {c.vecesMencionado}/{visibilidad.totalPreguntas}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-marca-magenta"
                        style={{
                          width: `${(c.vecesMencionado / maxMenciones) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
                {visibilidad.competidores.length === 0 && (
                  <li className="text-base text-zinc-500">
                    No detectamos competidores mencionados en estas preguntas.
                  </li>
                )}
              </ul>
            )}
          </TarjetaAnalisis>

          <TarjetaAnalisis
            titulo="Por qué no te menciona"
            cargando={cargando}
            error={error}
            onReintentar={onReintentar}
          >
            {visibilidad?.ok && (
              <ul className="space-y-3">
                {visibilidad.porQueNoTeMencionan.map((razon, i) => (
                  <li key={i} className="imprimir-bloque text-base text-zinc-600">
                    <span className="font-bold text-zinc-800">{i + 1}. </span>
                    {razon}
                  </li>
                ))}
              </ul>
            )}
          </TarjetaAnalisis>
        </div>
      </div>
    </section>
  );
}
