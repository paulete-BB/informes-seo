export default function TarjetaAnalisis({
  titulo,
  cargando,
  error,
  children,
}: {
  titulo: string;
  cargando?: boolean;
  error?: string;
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
        <p className="rounded-xl bg-zinc-50 p-4 text-base text-zinc-600">
          No pudimos completar este análisis: {error}
        </p>
      )}
      {!cargando && !error && children}
    </div>
  );
}
