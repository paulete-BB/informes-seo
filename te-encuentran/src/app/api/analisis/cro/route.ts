import Anthropic from "@anthropic-ai/sdk";
import { AnalisisCRO, DimensionCRO } from "@/lib/tipos";

export const maxDuration = 60;

const client = new Anthropic();

const ESQUEMA_DIMENSION = {
  type: "object",
  properties: {
    score: { type: "integer" },
    veredicto: { type: "string" },
    hallazgos: { type: "array", items: { type: "string" } },
  },
  required: ["score", "veredicto", "hallazgos"],
  additionalProperties: false,
} as const;

const ESQUEMA_CRO = {
  type: "object",
  properties: {
    pruebaCincoSegundos: ESQUEMA_DIMENSION,
    confianza: ESQUEMA_DIMENSION,
    accionClara: ESQUEMA_DIMENSION,
  },
  required: ["pruebaCincoSegundos", "confianza", "accionClara"],
  additionalProperties: false,
};

interface DimensionRespuesta {
  score: number;
  veredicto: string;
  hallazgos: string[];
}

interface RespuestaCRO {
  pruebaCincoSegundos: DimensionRespuesta;
  confianza: DimensionRespuesta;
  accionClara: DimensionRespuesta;
}

function respuestaVacia(error: string): AnalisisCRO {
  return { ok: false, error, dimensiones: [] };
}

async function fetchConTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(respuestaVacia("Solicitud inválida."));
  }

  const url = body.url;
  if (!url) {
    return Response.json(respuestaVacia("Falta la URL a analizar."));
  }

  const screenshotUrl = `https://image.thum.io/get/width/900/crop/1200/wait/4/${url}`;

  let imagenBase64: string;
  let mediaType: string;
  try {
    const res = await fetchConTimeout(screenshotUrl, 40000);
    if (!res.ok) {
      return Response.json(
        respuestaVacia("No pudimos obtener una captura de tu sitio. Intenta de nuevo en unos minutos.")
      );
    }
    mediaType = res.headers.get("content-type") ?? "image/jpeg";
    imagenBase64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    return Response.json(
      respuestaVacia("No pudimos obtener una captura de tu sitio. Intenta de nuevo en unos minutos.")
    );
  }

  let respuesta;
  try {
    respuesta = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      output_config: { format: { type: "json_schema", schema: ESQUEMA_CRO } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imagenBase64,
              },
            },
            {
              type: "text",
              text: `Ponte en el lugar de una persona que llega por primera vez a este sitio desde su celular, sin conocer el negocio. Mirando solo esta imagen (lo primero que ve, above the fold, en mobile), evalúa tres dimensiones:

1. pruebaCincoSegundos: en 5 segundos, ¿queda claro qué vende este negocio y a quién le sirve?
2. confianza: ¿esto se ve como un negocio real y confiable, o genera desconfianza? ¿por qué?
3. accionClara: ¿hay un botón o paso siguiente obvio, o hay demasiadas opciones compitiendo por la atención?

Para cada dimensión da un score de 0 a 100, un veredicto de una frase, y hallazgos concretos citando específicamente lo que ves en la imagen (colores, textos, botones, ubicación).`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error en análisis CRO:", error);
    return Response.json(
      respuestaVacia("No pudimos analizar visualmente tu sitio. Intenta de nuevo.")
    );
  }

  if (respuesta.stop_reason === "refusal") {
    return Response.json(
      respuestaVacia("No pudimos completar este análisis visual. Intenta de nuevo.")
    );
  }

  const bloqueTexto = respuesta.content.find((b) => b.type === "text");
  if (!bloqueTexto || bloqueTexto.type !== "text") {
    return Response.json(
      respuestaVacia("No obtuvimos un resultado válido del análisis visual.")
    );
  }

  let datos: RespuestaCRO;
  try {
    datos = JSON.parse(bloqueTexto.text);
  } catch {
    return Response.json(
      respuestaVacia("No pudimos interpretar el resultado del análisis visual.")
    );
  }

  const dimensiones: DimensionCRO[] = [
    { nombre: "La prueba de los 5 segundos", ...datos.pruebaCincoSegundos },
    { nombre: "Confianza", ...datos.confianza },
    { nombre: "Acción clara", ...datos.accionClara },
  ];

  const resultado: AnalisisCRO = { ok: true, screenshotUrl, dimensiones };
  return Response.json(resultado);
}
