// Tipos compartidos del informe. Los endpoints de las fases 1-5 deberán
// devolver objetos compatibles con estas formas.

export type EstadoSemaforo = "ok" | "alerta" | "critico";

export interface Hallazgo {
  id: string;
  titulo: string;
  estado: EstadoSemaforo;
  explicacion: string;
}

export interface AnalisisTecnico {
  ok: boolean;
  error?: string;
  hallazgos: Hallazgo[];
}

export interface MetricaPageSpeed {
  id: string;
  nombre: string;
  valor: string;
  estado: EstadoSemaforo;
  explicacion: string;
}

export interface AnalisisPageSpeed {
  ok: boolean;
  error?: string;
  scorePerformance: number;
  scoreSeo: number;
  scoreAccesibilidad: number;
  metricas: MetricaPageSpeed[];
}

export interface DimensionCRO {
  nombre: string;
  score: number;
  veredicto: string;
  hallazgos: string[];
}

export interface AnalisisCRO {
  ok: boolean;
  error?: string;
  screenshotUrl?: string;
  dimensiones: DimensionCRO[];
}

export interface PreguntaVisibilidad {
  pregunta: string;
  apareceNegocio: boolean;
  posicion?: number;
}

export interface Competidor {
  nombre: string;
  vecesMencionado: number;
}

export interface AnalisisVisibilidadIA {
  ok: boolean;
  error?: string;
  scoreVisibilidad: number; // cantidad de preguntas (de 10) donde aparece
  totalPreguntas: number;
  preguntas: PreguntaVisibilidad[];
  competidores: Competidor[];
  porQueNoTeMencionan: string[];
}

export interface DatosFormulario {
  url: string;
  rubro: string;
  ciudad: string;
}

export interface InformeCompleto {
  url: string;
  rubro: string;
  ciudad: string;
  visibilidadIA: AnalisisVisibilidadIA;
}
