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
    pagespeed: {
      ok: true,
      scorePerformance: 38,
      scoreSeo: 71,
      scoreAccesibilidad: 64,
      metricas: [
        {
          id: "lcp",
          nombre: "Velocidad de carga",
          valor: "5,2 s",
          estado: "critico",
          explicacion:
            "Tu sitio tarda 5,2 segundos en mostrar lo primero que la persona ve, desde el celular. Más de la mitad de las personas se va antes de que aparezca.",
        },
        {
          id: "cls",
          nombre: "Estabilidad visual",
          valor: "0,28",
          estado: "alerta",
          explicacion:
            "Los elementos de tu página se mueven mientras carga. Puede pasar que alguien toque un botón equivocado sin querer y se frustre.",
        },
        {
          id: "tbt",
          nombre: "Tiempo de respuesta",
          valor: "620 ms",
          estado: "alerta",
          explicacion:
            "Cuando alguien toca un botón, tu sitio tarda en reaccionar. Se siente pegado o lento, aunque ya haya cargado.",
        },
      ],
    },
    cro: {
      ok: true,
      screenshotUrl: undefined,
      dimensiones: [
        {
          nombre: "La prueba de los 5 segundos",
          score: 45,
          veredicto:
            "No queda claro de inmediato qué vendes ni a quién le sirve.",
          hallazgos: [
            "El texto principal habla de la empresa, no del problema que resuelve.",
            "No hay una frase corta que diga a quién le sirve el servicio.",
          ],
        },
        {
          nombre: "Confianza",
          score: 60,
          veredicto: "Se ve como un negocio real, pero le faltan respaldos.",
          hallazgos: [
            "No hay testimonios ni fotos del taller o del equipo.",
            "No se ve la dirección física en la primera pantalla.",
          ],
        },
        {
          nombre: "Acción clara",
          score: 30,
          veredicto: "Hay demasiados botones compitiendo por la atención.",
          hallazgos: [
            "Se cuentan 5 botones distintos en la primera pantalla.",
            "Ninguno destaca visualmente sobre el resto.",
          ],
        },
      ],
    },
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
