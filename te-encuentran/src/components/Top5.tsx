import { AccionPrioridad } from "@/lib/tipos";
import Semaforo from "./Semaforo";

export default function Top5({ acciones }: { acciones: AccionPrioridad[] }) {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-zinc-900 sm:text-4xl">
          Las 5 cosas que arreglaría primero
        </h2>
        <p className="mt-2 max-w-2xl text-lg text-zinc-600">
          Ordenadas por impacto: lo que más te cuesta plata o clientes va
          primero.
        </p>
      </div>

      <ol className="space-y-4">
        {acciones.map((accion, i) => (
          <li
            key={accion.id}
            className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:gap-6"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg font-extrabold text-white">
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-bold text-zinc-900">
                  {accion.titulo}
                </h3>
                <Semaforo estado={accion.urgencia} />
              </div>
              <p className="mb-3 text-base text-zinc-600">
                {accion.porQueImporta}
              </p>
              <span className="inline-block rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600">
                Esfuerzo: {accion.esfuerzo}
              </span>
              {accion.copyPaste && (
                <pre className="mt-3 overflow-x-auto rounded-xl bg-zinc-900 p-4 text-sm text-zinc-100">
                  {accion.copyPaste}
                </pre>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
