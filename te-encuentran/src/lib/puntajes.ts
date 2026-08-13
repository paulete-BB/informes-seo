import { EstadoSemaforo } from "./tipos";

export function estadoPorPuntaje(valor: number): EstadoSemaforo {
  if (valor >= 70) return "ok";
  if (valor >= 45) return "alerta";
  return "critico";
}

export function promedio(valores: number[]): number {
  return Math.round(valores.reduce((acc, v) => acc + v, 0) / valores.length);
}
