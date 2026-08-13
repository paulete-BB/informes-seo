import { client, detectarSenalesTecnicas, dominioRaiz, SenalesTecnicas } from "@/lib/visibilidad-ia";
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

interface EvaluacionCompleta {
  resultados: ResultadoEvaluacion[];
  competidores: Competidor[];
  razones: string[];
}

async function evaluarRespuestas(
  hostname: string,
  raiz: string,
  rubro: string,
  ciudad: string,
  preguntas: string[],
  respuestas: string[],
  senales: SenalesTecnicas
): Promise<EvaluacionCompleta> {
  const bloquesQyA = preguntas
    .map(
      (p, i) =>
        `Pregunta ${i + 1}: ${p}\nRespuesta obtenida (con búsqueda web real): ${
          respuestas[i] || "(sin respuesta disponible)"
        }`
    )
    .join("\n\n---\n\n");

  const senalesTexto = [
    `Datos estructurados (Schema LocalBusiness/Organization): ${senales.tieneSchemaNegocio ? "SÍ tiene" : "NO tiene"}`,
    `Archivo llms.txt: ${senales.tieneLlmsTxt ? "SÍ tiene" : "NO tiene"}`,
    `Contenido de texto en su sitio: ${senales.contenidoEscaso ? "escaso" : "razonable"}`,
  ].join("\n");

  const respuesta = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 3072,
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            resultados: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  apareceNegocio: { type: "boolean" },
                  posicion: { anyOf: [{ type: "integer" }, { type: "null" }] },
                },
                required: ["apareceNegocio", "posicion"],
                additionalProperties: false,
              },
            },
            competidores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nombre: { type: "string" },
                  vecesMencionado: { type: "integer" },
                },
                required: ["nombre", "vecesMencionado"],
                additionalProperties: false,
              },
            },
            razones: { type: "array", items: { type: "string" } },
          },
          required: ["resultados", "competidores", "razones"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "user",
        content: `El negocio que estamos evaluando es "${rubro}" en "${ciudad}", con sitio web ${hostname} (nombre de marca aproximado: "${raiz}", considera variantes con y sin tildes y con sufijos tipo SpA o Ltda).

Abajo hay ${preguntas.length} preguntas que una persona real le haría a ChatGPT, junto con la respuesta real que se obtuvo (con búsqueda web activada):

${bloquesQyA}

Para cada una de las ${preguntas.length} preguntas, en el mismo orden:
1. ¿Apareció mencionado este negocio (por dominio o nombre de marca, con esas variantes)? true/false.
2. Si apareció, ¿en qué posición aproximada quedó entre los negocios mencionados en esa respuesta (1 = el primero o más destacado)? Si no apareció, usa null.

Luego, mirando las ${preguntas.length} respuestas en conjunto: ¿qué otros negocios (competidores, no el que estamos evaluando) aparecieron mencionados? Lista hasta 5, con el nombre y en cuántas de las ${preguntas.length} respuestas aparece cada uno, ordenados de mayor a menor.

Finalmente, estas son las señales técnicas reales detectadas en el sitio del negocio:
${senalesTexto}

Dame EXACTAMENTE 3 razones concretas y accionables, en lenguaje simple para un dueño de negocio (no técnico), de por qué la IA no lo menciona o lo menciona poco. Prioriza razones respaldadas por las señales técnicas reales de arriba. Si necesitas una tercera razón y no hay más señales técnicas confirmadas, usa una causa común y razonable (poca presencia en directorios o reseñas externas) pero sin inventar datos específicos que no tengas.`,
      },
    ],
  }, { maxRetries: 3 });

  const bloque = respuesta.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") {
    throw new Error("Sin resultado de evaluación");
  }
  return JSON.parse(bloque.text);
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

  let evaluacion: EvaluacionCompleta;
  try {
    evaluacion = await evaluarRespuestas(hostname, raiz, rubro, ciudad, preguntas, respuestas, senales);
  } catch (error) {
    console.error("Error evaluando visibilidad IA:", error);
    return Response.json(
      respuestaVacia("Obtuvimos las respuestas de la IA, pero no pudimos evaluarlas. Intenta de nuevo.")
    );
  }

  const preguntasEvaluadas: PreguntaVisibilidad[] = preguntas.map((pregunta, i) => ({
    pregunta,
    apareceNegocio: evaluacion.resultados[i]?.apareceNegocio ?? false,
    posicion: evaluacion.resultados[i]?.posicion ?? undefined,
  }));

  const scoreVisibilidad = preguntasEvaluadas.filter((p) => p.apareceNegocio).length;

  const resultado: AnalisisVisibilidadIA = {
    ok: true,
    scoreVisibilidad,
    totalPreguntas: preguntas.length,
    preguntas: preguntasEvaluadas,
    competidores: evaluacion.competidores,
    porQueNoTeMencionan: evaluacion.razones,
  };

  return Response.json(resultado);
}
