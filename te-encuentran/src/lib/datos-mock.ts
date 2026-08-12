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
    tecnico: {
      ok: true,
      hallazgos: [
        {
          id: "titulo",
          titulo: "Título y descripción de la página",
          estado: "alerta",
          explicacion:
            "Tu página tiene un título, pero es muy genérico (\"Inicio\"). Cuando alguien busca en Google, ese título es lo primero que lee: si no dice qué vendes ni dónde estás, pierdes el clic antes de que entre a tu web.",
        },
        {
          id: "h1",
          titulo: "Encabezado principal (H1)",
          estado: "critico",
          explicacion:
            "No encontramos un encabezado principal claro en tu página. Es como un local sin letrero: Google no tiene forma fácil de saber de qué se trata tu negocio.",
        },
        {
          id: "schema",
          titulo: "Datos estructurados (Schema.org)",
          estado: "critico",
          explicacion:
            "Tu sitio no le informa a Google, de forma explícita, cuál es tu dirección, tu horario o tu tipo de negocio. Es información que Google usa para mostrarte en el mapa y en las respuestas de la IA.",
        },
        {
          id: "sitemap",
          titulo: "Mapa del sitio (sitemap.xml)",
          estado: "ok",
          explicacion:
            "Existe un mapa del sitio. Esto ayuda a que Google encuentre todas tus páginas más rápido.",
        },
        {
          id: "llms",
          titulo: "Archivo llms.txt",
          estado: "critico",
          explicacion:
            "No existe un archivo llms.txt. Es un estándar nuevo (2024) que le explica a las IAs como ChatGPT de qué trata tu sitio. Casi nadie lo tiene todavía: tenerlo te puede dar ventaja.",
        },
        {
          id: "contacto",
          titulo: "Formas de contacto",
          estado: "ok",
          explicacion:
            "Tu teléfono y un botón de WhatsApp están visibles. Eso genera confianza y facilita que te escriban.",
        },
      ],
    },
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
    prioridades: [
      {
        id: "1",
        titulo: "Agregar tu dirección, horario y rubro en un formato que Google y la IA entiendan",
        porQueImporta:
          "Hoy no puedes aparecer en el mapa de Google ni en las respuestas de ChatGPT si tu ficha no dice, de forma clara, qué eres y dónde estás. Estás perdiendo clientes que buscan justo lo que ofreces.",
        urgencia: "critico",
        esfuerzo: "Requiere ayuda técnica (15-30 min)",
      },
      {
        id: "2",
        titulo: "Escribir un titular claro que diga qué vendes y a quién le sirve",
        porQueImporta:
          "Las primeras personas que entran a tu web se van en 5 segundos si no entienden qué haces. Cada visita que se va sin entender es una venta perdida.",
        urgencia: "critico",
        esfuerzo: "Minutos",
      },
      {
        id: "3",
        titulo: "Mejorar la velocidad de carga en celular",
        porQueImporta:
          "Más de la mitad de las personas abandona un sitio que tarda más de 3 segundos en celular. Con 5,2 segundos, estás dejando ir clientes antes de que vean tu oferta.",
        urgencia: "alerta",
        esfuerzo: "Requiere ayuda técnica",
      },
      {
        id: "4",
        titulo: "Dejar un solo botón de acción claro, arriba de todo",
        porQueImporta:
          "Con 5 botones compitiendo, la persona no sabe qué hacer y no hace nada. Un solo botón (\"Escríbenos por WhatsApp\") multiplica las conversiones.",
        urgencia: "alerta",
        esfuerzo: "Horas",
      },
      {
        id: "5",
        titulo: "Sumar testimonios y fotos reales del negocio",
        porQueImporta:
          "La confianza es lo que falta para que alguien nuevo se decida. Sin caras ni opiniones reales, compite en desventaja frente a negocios que sí las muestran.",
        urgencia: "alerta",
        esfuerzo: "Horas",
      },
    ],
  };
}
