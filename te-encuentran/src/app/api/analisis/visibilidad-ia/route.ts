import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";
import { AnalisisVisibilidadIA, Competidor, PreguntaVisibilidad } from "@/lib/tipos";

export const maxDuration = 60;

const client = new Anthropic();

const CONCURRENCIA_BUSQUEDAS = 5;

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

async function fetchConTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TeEncuentranBot/1.0)" },
    });
  } finally {
    clearTimeout(timeout);
  }
}

// Ejecuta las tareas con concurrencia limitada, al estilo Promise.allSettled.
async function conConcurrenciaLimitada<T>(
  tareas: Array<() => Promise<T>>,
  limite: number
): Promise<PromiseSettledResult<T>[]> {
  const resultados: PromiseSettledResult<T>[] = new Array(tareas.length);
  let siguiente = 0;

  async function trabajador() {
    while (siguiente < tareas.length) {
      const indice = siguiente++;
      try {
        const value = await tareas[indice]();
        resultados[indice] = { status: "fulfilled", value };
      } catch (reason) {
        resultados[indice] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limite, tareas.length) }, () => trabajador())
  );
  return resultados;
}

function dominioRaiz(url: string): { hostname: string; raiz: string } {
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const raiz = hostname.split(".")[0];
  return { hostname, raiz };
}

interface SenalesTecnicas {
  tieneSchemaNegocio: boolean;
  tieneLlmsTxt: boolean;
  contenidoEscaso: boolean;
}

async function detectarSenalesTecnicas(url: string): Promise<SenalesTecnicas> {
  let tieneSchemaNegocio = false;
  let contenidoEscaso = true;

  try {
    const res = await fetchConTimeout(url, 8000);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const bloques = $('script[type="application/ld+json"]')
        .map((_, el) => $(el).contents().text())
        .get();
      for (const bloque of bloques) {
        try {
          const datos = JSON.parse(bloque);
          const items = Array.isArray(datos) ? datos : [datos];
          for (const item of items) {
            if (/LocalBusiness|Organization/i.test(String(item?.["@type"] ?? ""))) {
              tieneSchemaNegocio = true;
            }
          }
        } catch {
          // JSON inválido, se ignora.
        }
      }
      const palabras = $("body").text().trim().split(/\s+/).filter(Boolean);
      contenidoEscaso = palabras.length < 300;
    }
  } catch {
    // No pudimos revisar el sitio; seguimos sin estas señales.
  }

  let tieneLlmsTxt = false;
  try {
    const { hostname } = dominioRaiz(url);
    const res = await fetchConTimeout(`https://${hostname}/llms.txt`, 5000);
    tieneLlmsTxt = res.ok;
  } catch {
    // Se asume que no existe.
  }

  return { tieneSchemaNegocio, tieneLlmsTxt, contenidoEscaso };
}

async function generarPreguntas(rubro: string, ciudad: string): Promise<string[]> {
  const respuesta = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            preguntas: { type: "array", items: { type: "string" } },
          },
          required: ["preguntas"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "user",
        content: `Genera exactamente 7 preguntas realistas que una persona de verdad le escribiría a ChatGPT cuando está buscando "${rubro}" en "${ciudad}". No nombres ningún negocio específico.

Mezcla estos tipos de intención (al menos una de cada uno):
- Descubrimiento: "¿dónde puedo encontrar...?"
- Comparación: "¿cuál es mejor...?"
- Recomendación directa: "recomiéndame..."
- Con un problema concreto: "se me rompió X, ¿qué hago?"

Las preguntas deben sonar naturales, como las escribiría una persona real, no un buscador.`,
      },
    ],
  });

  const bloque = respuesta.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") return [];
  try {
    const datos = JSON.parse(bloque.text);
    return Array.isArray(datos.preguntas) ? datos.preguntas : [];
  } catch {
    return [];
  }
}

async function responderConBusqueda(pregunta: string): Promise<string> {
  const respuesta = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    tools: [{ type: "web_search_20260209", name: "web_search" }],
    messages: [{ role: "user", content: pregunta }],
  });

  return respuesta.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n\n");
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
  });

  const bloque = respuesta.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") {
    throw new Error("Sin resultado de evaluación");
  }
  return JSON.parse(bloque.text);
}

export async function POST(request: Request) {
  let body: { url?: string; rubro?: string; ciudad?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(respuestaVacia("Solicitud inválida."));
  }

  const { url, rubro, ciudad } = body;
  if (!url || !rubro || !ciudad) {
    return Response.json(respuestaVacia("Faltan datos para hacer este análisis."));
  }

  const { hostname, raiz } = dominioRaiz(url);

  let preguntas: string[];
  try {
    preguntas = await generarPreguntas(rubro, ciudad);
  } catch (error) {
    console.error("Error generando preguntas de visibilidad IA:", error);
    return Response.json(
      respuestaVacia("No pudimos generar las preguntas de prueba. Intenta de nuevo.")
    );
  }

  if (preguntas.length === 0) {
    return Response.json(
      respuestaVacia("No pudimos generar las preguntas de prueba. Intenta de nuevo.")
    );
  }

  const [resultadosBusqueda, senales] = await Promise.all([
    conConcurrenciaLimitada(
      preguntas.map((p) => () => responderConBusqueda(p)),
      CONCURRENCIA_BUSQUEDAS
    ),
    detectarSenalesTecnicas(url),
  ]);

  const respuestas = resultadosBusqueda.map((r) =>
    r.status === "fulfilled" ? r.value : ""
  );

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
