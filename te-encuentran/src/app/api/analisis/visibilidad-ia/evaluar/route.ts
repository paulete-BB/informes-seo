import { CONFIG_RAPIDA, detectarSenalesTecnicas, dominioRaiz, extraerJson, generarConFallback, SenalesTecnicas } from "@/lib/visibilidad-ia";
import { AnalisisVisibilidadIA, Competidor, PreguntaVisibilidad } from "@/lib/tipos";

export const maxDuration = 60;

function respuestaVacia(error: string): AnalisisVisibilidadIA {
  return {
    ok: false,
    error,
    scoreVisibilidad: 0,
    totalPreguntas: 0,
    preguntas: [],
    competidores: [],
    porQueNoTeMencionan: [],
  };
}

interface ResultadoEvaluacion {
  apareceNegocio: boolean;
  posicion: number | null;
}

interface Menciones {
  resultados: ResultadoEvaluacion[];
  competidores: Competidor[];
}

async function evaluarMenciones(
  hostname: string,
  raiz: string,
  rubro: string,
  ciudad: string,
  preguntas: string[],
  respuestas: string[]
): Promise<Menciones> {
  const bloquesQyA = preguntas
    .map(
      (p, i) =>
        `Pregunta ${i + 1}: ${p}\nRespuesta que dio la IA: ${
          respuestas[i] || "(sin respuesta disponible)"
        }`
    )
    .join("\n\n---\n\n");

  const respuesta = await generarConFallback({
    contents: `El negocio que estamos evaluando es "${rubro}" en "${ciudad}", con sitio web ${hostname} (nombre de marca aproximado: "${raiz}", considera variantes con y sin tildes y con sufijos tipo SpA o Ltda).

Abajo hay ${preguntas.length} preguntas que una persona real le haría a un asistente de IA, junto con la respuesta que dio ese asistente (basada en resultados de búsqueda web reales y actuales):

${bloquesQyA}

Para cada una de las ${preguntas.length} preguntas, en el mismo orden:
1. ¿Apareció mencionado este negocio (por dominio o nombre de marca, con esas variantes)? true/false.
2. Si apareció, ¿en qué posición aproximada quedó entre los negocios mencionados en esa respuesta (1 = el primero o más destacado)? Si no apareció, usa null.

Luego, mirando las ${preguntas.length} respuestas en conjunto: ¿qué otros negocios (competidores, no el que estamos evaluando) aparecieron mencionados? Lista hasta 5, con el nombre y en cuántas de las ${preguntas.length} respuestas aparece cada uno, ordenados de mayor a menor.

Responde ÚNICAMENTE con un JSON válido con esta forma exacta, sin texto adicional ni bloques de código:
{"resultados": [{"apareceNegocio": true, "posicion": 1}, ...], "competidores": [{"nombre": "...", "vecesMencionado": 2}]}`,
    config: CONFIG_RAPIDA,
  });

  const texto = respuesta.text;
  if (!texto) {
    throw new Error("Sin resultado de menciones");
  }
  return extraerJson(texto) as Menciones;
}

async function generarRazones(
  hostname: string,
  rubro: string,
  ciudad: string,
  senales: SenalesTecnicas
): Promise<string[]> {
  const senalesTexto = [
    `Datos estructurados (Schema LocalBusiness/Organization): ${senales.tieneSchemaNegocio ? "SÍ tiene" : "NO tiene"}`,
    `Archivo llms.txt: ${senales.tieneLlmsTxt ? "SÍ tiene" : "NO tiene"}`,
    `Contenido de texto en su sitio: ${senales.contenidoEscaso ? "escaso" : "razonable"}`,
  ].join("\n");

  const respuesta = await generarConFallback({
    contents: `El negocio es "${rubro}" en "${ciudad}", con sitio web ${hostname}. Estamos evaluando por qué un asistente de IA con búsqueda web en tiempo real (como ChatGPT navegando) podría no encontrar o mencionar poco a este negocio al responder preguntas de personas reales. Estas son las señales técnicas reales detectadas en su sitio:
${senalesTexto}

Dame EXACTAMENTE 3 razones concretas, en lenguaje simple para un dueño de negocio (no técnico), respaldadas por las señales técnicas de arriba y por causas comunes de baja visibilidad en búsquedas con IA: poca presencia en directorios o reseñas externas, contenido escaso que no explica bien los servicios, falta de datos estructurados que ayuden a la IA a identificar el negocio, o poca autoridad/menciones de terceros en internet. No inventes datos específicos que no tengas.

Responde ÚNICAMENTE con un JSON válido con esta forma exacta, sin texto adicional ni bloques de código:
{"razones": ["...", "...", "..."]}`,
    config: CONFIG_RAPIDA,
  });

  const texto = respuesta.text;
  if (!texto) {
    throw new Error("Sin resultado de razones");
  }
  const datos = extraerJson(texto) as { razones?: unknown };
  return Array.isArray(datos.razones) ? datos.razones : [];
}

export async function POST(request: Request) {
  let body: {
    url?: string;
    rubro?: string;
    ciudad?: string;
    resultados?: Array<{ pregunta: string; respuesta: string }>;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json(respuestaVacia("Solicitud inválida."));
  }

  const { url, rubro, ciudad, resultados } = body;
  if (!url || !rubro || !ciudad || !resultados || resultados.length === 0) {
    return Response.json(respuestaVacia("Faltan datos para evaluar la visibilidad."));
  }

  const { hostname, raiz } = dominioRaiz(url);
  const preguntas = resultados.map((r) => r.pregunta);
  const respuestas = resultados.map((r) => r.respuesta);

  const senales = await detectarSenalesTecnicas(url);

  let menciones: Menciones;
  try {
    menciones = await evaluarMenciones(hostname, raiz, rubro, ciudad, preguntas, respuestas);
  } catch (error) {
    console.error("Error evaluando menciones de visibilidad IA:", error);
    return Response.json(
      respuestaVacia("Obtuvimos las respuestas de la IA, pero no pudimos evaluarlas. Intenta de nuevo.")
    );
  }

  let razones: string[] = [];
  try {
    razones = await generarRazones(hostname, rubro, ciudad, senales);
  } catch (error) {
    console.error("Error generando razones de visibilidad IA:", error);
    razones = [
      "No pudimos generar el detalle de por qué la IA no te menciona en este momento. Intenta de nuevo más tarde.",
    ];
  }

  const preguntasEvaluadas: PreguntaVisibilidad[] = preguntas.map((pregunta, i) => ({
    pregunta,
    apareceNegocio: menciones.resultados[i]?.apareceNegocio ?? false,
    posicion: menciones.resultados[i]?.posicion ?? undefined,
  }));

  const scoreVisibilidad = preguntasEvaluadas.filter((p) => p.apareceNegocio).length;

  const resultado: AnalisisVisibilidadIA = {
    ok: true,
    scoreVisibilidad,
    totalPreguntas: preguntas.length,
    preguntas: preguntasEvaluadas,
    competidores: menciones.competidores,
    porQueNoTeMencionan: razones,
  };

  return Response.json(resultado);
}
