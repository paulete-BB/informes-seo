import { extraerJson, fetchConTimeout, ia, MODELOS_FALLBACK } from "@/lib/visibilidad-ia";
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

const PROMPT_CRO = `Ponte en el lugar de una persona que llega por primera vez a este sitio desde su celular, sin conocer el negocio. Mirando solo esta imagen (lo primero que ve, above the fold, en mobile), evalúa tres dimensiones:

1. pruebaCincoSegundos: en 5 segundos, ¿queda claro qué vende este negocio y a quién le sirve?
2. confianza: ¿esto se ve como un negocio real y confiable, o genera desconfianza? ¿por qué?
3. accionClara: ¿hay un botón o paso siguiente obvio, o hay demasiadas opciones compitiendo por la atención?

Para cada dimensión da un score de 0 a 100, un veredicto de una frase, y hallazgos concretos citando específicamente lo que ves en la imagen (colores, textos, botones, ubicación).

Responde ÚNICAMENTE con un JSON válido con esta forma exacta, sin texto adicional ni bloques de código:
{"pruebaCincoSegundos": {"score": 0, "veredicto": "...", "hallazgos": ["...", "..."]}, "confianza": {"score": 0, "veredicto": "...", "hallazgos": ["...", "..."]}, "accionClara": {"score": 0, "veredicto": "...", "hallazgos": ["...", "..."]}}`;

class ErrorAnalisisVisual extends Error {}

// El modelo de visión a veces tarda más de lo esperado (sobre todo con
// capturas más pesadas), devuelve un JSON mal formado, o tiene la cuota
// diaria agotada; se reintenta la generación completa (no solo la
// conexión) probando el siguiente modelo de la lista de respaldo antes de
// rendirse. Cada intento tiene su propio timeout, y el peor caso (2
// intentos agotando su timeout) todavía cabe con margen dentro del
// maxDuration del endpoint, incluso sumando el tiempo de la captura.
async function generarAnalisisCRO(imagenBase64: string, mediaType: string): Promise<RespuestaCRO> {
  let ultimoError = "No pudimos analizar visualmente tu sitio. Intenta de nuevo.";

  for (const modelo of MODELOS_FALLBACK.slice(0, 2)) {
    let respuesta;
    try {
      respuesta = await ia.models.generateContent({
        model: modelo,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: imagenBase64, mimeType: mediaType } },
              { text: PROMPT_CRO },
            ],
          },
        ],
        config: {
          maxOutputTokens: 3072,
          httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } },
        },
      });
    } catch (error) {
      console.error(`Error en análisis CRO (modelo ${modelo}):`, error);
      continue;
    }

    const finishReason = respuesta.candidates?.[0]?.finishReason;
    if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
      throw new ErrorAnalisisVisual("No pudimos completar este análisis visual. Intenta de nuevo.");
    }
    if (finishReason === "MAX_TOKENS") {
      ultimoError = "El análisis visual quedó incompleto. Intenta de nuevo.";
      continue;
    }

    const texto = respuesta.text;
    if (!texto) {
      ultimoError = "No obtuvimos un resultado válido del análisis visual.";
      continue;
    }

    try {
      return extraerJson(texto) as RespuestaCRO;
    } catch {
      console.error("JSON inválido en análisis CRO:", texto);
      ultimoError = "No pudimos interpretar el resultado del análisis visual.";
    }
  }

  throw new ErrorAnalisisVisual(ultimoError);
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

  // Captura más liviana: una imagen grande puede hacer que el modelo de
  // visión tarde mucho más (o se cuelgue) sin ganar precisión relevante
  // para este análisis de primera impresión. "noanimate" es clave: sin él,
  // la primera vez que se captura una URL (sin caché en thum.io) devuelve
  // un GIF animado cuyo primer frame es un spinner de "cargando", y el
  // modelo de visión termina analizando ese spinner en vez del sitio real.
  const screenshotUrl = `https://image.thum.io/get/width/600/crop/900/noanimate/wait/4/${url}`;

  let imagenBase64: string;
  let mediaType: string;
  try {
    const res = await fetchConTimeout(screenshotUrl, 15000);
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

  let datos: RespuestaCRO;
  try {
    datos = await generarAnalisisCRO(imagenBase64, mediaType);
  } catch (error) {
    return Response.json(
      respuestaVacia(
        error instanceof Error ? error.message : "No pudimos analizar visualmente tu sitio. Intenta de nuevo."
      )
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
