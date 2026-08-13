function colorPorPuntaje(valor: number) {
  if (valor >= 70) return { barra: "bg-emerald-500", texto: "text-emerald-700" };
  if (valor >= 45) return { barra: "bg-amber-500", texto: "text-amber-700" };
  return { barra: "bg-red-500", texto: "text-red-700" };
}

export default function Puntaje({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: number;
}) {
  const color = colorPorPuntaje(valor);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-base font-medium text-zinc-600">{etiqueta}</span>
        <span className={`text-2xl font-extrabold ${color.texto}`}>{valor}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full ${color.barra}`}
          style={{ width: `${Math.max(0, Math.min(100, valor))}%` }}
        />
      </div>
    </div>
  );
}
