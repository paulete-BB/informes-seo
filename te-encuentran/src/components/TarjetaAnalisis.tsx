export default function TarjetaAnalisis({
  titulo,
  cargando,
  error,
  onReintentar,
  children,
}: {
  titulo: string;
  cargando?: boolean;
  error?: string;
  onReintentar?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <h3 className="mb-4 text-xl font-bold text-zinc-900 sm:text-2xl">
        {titulo}
      </h3>
      {cargando && (
        <div className="flex items-center gap-3 text-zinc-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
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
              className="mt-3 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
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
