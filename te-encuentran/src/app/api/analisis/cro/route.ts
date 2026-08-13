import { extraerJson, fetchConTimeout, ia, MODELO_VISION } from "@/lib/visibilidad-ia";
import { AnalisisCRO, DimensionCRO } from "@/lib/tipos";

export const maxDuration = 60;

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
    const res = await fetchConTimeout(screenshotUrl, 20000);
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
    respuesta = await ia.models.generateContent({
      model: MODELO_VISION,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: imagenBase64, mimeType: mediaType } },
            {
              text: `Ponte en el lugar de una persona que llega por primera vez a este sitio desde su celular, sin conocer el negocio. Mirando solo esta imagen (lo primero que ve, above the fold, en mobile), evalúa tres dimensiones:

1. pruebaCincoSegundos: en 5 segundos, ¿queda claro qué vende este negocio y a quién le sirve?
2. confianza: ¿esto se ve como un negocio real y confiable, o genera desconfianza? ¿por qué?
3. accionClara: ¿hay un botón o paso siguiente obvio, o hay demasiadas opciones compitiendo por la atención?

Para cada dimensión da un score de 0 a 100, un veredicto de una frase, y hallazgos concretos citando específicamente lo que ves en la imagen (colores, textos, botones, ubicación).

Responde ÚNICAMENTE con un JSON válido con esta forma exacta, sin texto adicional ni bloques de código:
{"pruebaCincoSegundos": {"score": 0, "veredicto": "...", "hallazgos": ["...", "..."]}, "confianza": {"score": 0, "veredicto": "...", "hallazgos": ["...", "..."]}, "accionClara": {"score": 0, "veredicto": "...", "hallazgos": ["...", "..."]}}`,
            },
          ],
        },
      ],
      config: {
        maxOutputTokens: 2048,
        httpOptions: { timeout: 35000, retryOptions: { attempts: 2, initialDelay: 2, maxDelay: 15 } },
      },
    });
  } catch (error) {
    console.error("Error en análisis CRO:", error);
    return Response.json(
      respuestaVacia("No pudimos analizar visualmente tu sitio. Intenta de nuevo.")
    );
  }

  const finishReason = respuesta.candidates?.[0]?.finishReason;
  if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
    return Response.json(
      respuestaVacia("No pudimos completar este análisis visual. Intenta de nuevo.")
    );
  }
  if (finishReason === "MAX_TOKENS") {
    return Response.json(
      respuestaVacia("El análisis visual quedó incompleto. Intenta de nuevo.")
    );
  }

  const texto = respuesta.text;
  if (!texto) {
    return Response.json(
      respuestaVacia("No obtuvimos un resultado válido del análisis visual.")
    );
  }

  let datos: RespuestaCRO;
  try {
    datos = extraerJson(texto) as RespuestaCRO;
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
