import { EstadoSemaforo } from "@/lib/tipos";

const ESTILOS: Record<
  EstadoSemaforo,
  { punto: string; texto: string; fondo: string; etiqueta: string }
> = {
  ok: {
    punto: "bg-emerald-500",
    texto: "text-emerald-800",
    fondo: "bg-emerald-50 border-emerald-200",
    etiqueta: "Bien",
  },
  alerta: {
    punto: "bg-amber-500",
    texto: "text-amber-800",
    fondo: "bg-amber-50 border-amber-200",
    etiqueta: "Atención",
  },
  critico: {
    punto: "bg-red-500",
    texto: "text-red-800",
    fondo: "bg-red-50 border-red-200",
    etiqueta: "Urgente",
  },
};

export default function Semaforo({ estado }: { estado: EstadoSemaforo }) {
  const estilo = ESTILOS[estado];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${estilo.fondo} ${estilo.texto}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${estilo.punto}`} />
      {estilo.etiqueta}
    </span>
  );
}
