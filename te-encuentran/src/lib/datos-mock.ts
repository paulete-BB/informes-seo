import { InformeCompleto } from "./tipos";

// Datos de ejemplo para la Fase 0. Sirven solo para probar el layout del
// informe completo antes de que existan los endpoints reales.
export function generarInformeMock(
  url: string,
  rubro: string,
  ciudad: string
): InformeCompleto {
  return {
    url,
    rubro,
    ciudad,
    visibilidadIA: {
      ok: true,
      scoreVisibilidad: 1,
      totalPreguntas: 10,
      preguntas: [
        {
          pregunta: `¿Dónde puedo encontrar un buen ${rubro} en ${ciudad}?`,
          apareceNegocio: false,
        },
        {
          pregunta: `Recomiéndame un ${rubro} cerca de ${ciudad}`,
          apareceNegocio: false,
        },
        {
          pregunta: `¿Cuál es el mejor ${rubro} en ${ciudad}, y por qué?`,
          apareceNegocio: false,
        },
        {
          pregunta: `Se me rompió algo y necesito un ${rubro} urgente en ${ciudad}, ¿qué hago?`,
          apareceNegocio: true,
          posicion: 4,
        },
        {
          pregunta: `¿Qué opciones de ${rubro} hay en ${ciudad} con buenas reseñas?`,
          apareceNegocio: false,
        },
        {
          pregunta: `Necesito cotizar un ${rubro} en ${ciudad}, ¿a quién contacto?`,
          apareceNegocio: false,
        },
        {
          pregunta: `¿Qué ${rubro} atiende hoy mismo en ${ciudad}?`,
          apareceNegocio: false,
        },
        {
          pregunta: `Comparación de ${rubro} en ${ciudad}: ¿cuál conviene más?`,
          apareceNegocio: false,
        },
        {
          pregunta: `¿Alguien tiene experiencia con algún ${rubro} en ${ciudad}?`,
          apareceNegocio: false,
        },
        {
          pregunta: `¿Cuánto cobra en promedio un ${rubro} en ${ciudad}?`,
          apareceNegocio: false,
        },
      ],
      competidores: [
        { nombre: "Servicios Rápidos Ñuñoa", vecesMencionado: 7 },
        { nombre: "Taller Hermanos Soto", vecesMencionado: 5 },
        { nombre: "ExpressFix", vecesMencionado: 3 },
      ],
      porQueNoTeMencionan: [
        "No tienes datos estructurados (Schema LocalBusiness): la IA no encuentra de forma clara tu dirección, horario ni rubro exacto.",
        "Tu web tiene poco contenido escrito sobre lo que realmente haces: la IA aprende de texto, y el tuyo es escaso.",
        "No apareces en directorios ni menciones externas: la IA se apoya en fuentes de terceros, y hoy casi nadie te nombra fuera de tu propio sitio.",
      ],
    },
  };
}
