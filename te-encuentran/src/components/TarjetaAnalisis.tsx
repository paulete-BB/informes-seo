import { estadoPorPuntaje } from "@/lib/puntajes";

const CLASES_PUNTAJE = {
  ok: "bg-emerald-50 text-emerald-700",
  alerta: "bg-amber-50 text-amber-700",
  critico: "bg-red-50 text-red-700",
};

export default function TarjetaAnalisis({
  titulo,
  puntaje,
  cargando,
  error,
  onReintentar,
  children,
}: {
  titulo: string;
  puntaje?: number;
  cargando?: boolean;
  error?: string;
  onReintentar?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-zinc-900 sm:text-2xl">{titulo}</h3>
        {typeof puntaje === "number" && !cargando && !error && (
          <span
            className={`rounded-full px-3 py-1 text-base font-bold ${CLASES_PUNTAJE[estadoPorPuntaje(puntaje)]}`}
          >
            {puntaje}
          </span>
        )}
      </div>
      {cargando && (
        <div className="flex items-center gap-3 text-zinc-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-marca-magenta" />
          <span className="text-base">Analizando...</span>
        </div>
      )}
      {!cargando && error && (
        <div className="rounded-xl bg-zinc-50 p-4">
          <p className="text-base text-zinc-600">
            No pudimos completar este análisis: {error}
          </p>
          {onReintentar && (
            <button
              onClick={onReintentar}
              className="mt-3 rounded-lg border border-marca-magenta/30 bg-white px-4 py-2 text-sm font-semibold text-marca-purpura hover:bg-marca-magenta/5 print:hidden"
            >
              Reintentar
            </button>
          )}
        </div>
      )}
      {!cargando && !error && children}
    </div>
  );
}
