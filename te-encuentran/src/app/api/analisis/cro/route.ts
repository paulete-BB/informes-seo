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

interface Captura {
  imagenBase64: string;
  mediaType: string;
  screenshotUrl: string;
}

function respuestaVacia(error: string): AnalisisCRO {
  return { ok: false, error, dimensiones: [] };
}

// Captura más liviana: una imagen grande puede hacer que el modelo de visión
// tarde mucho más (o se cuelgue) sin ganar precisión relevante. "noanimate"
// es clave: sin él, la primera vez que se captura una URL (sin caché en
// thum.io) devuelve un GIF animado cuyo primer frame es un spinner de
// "cargando", y el modelo de visión termina analizando ese spinner en vez
// del sitio real.
async function capturarConThumIo(url: string): Promise<Captura | null> {
  const screenshotUrl = `https://image.thum.io/get/width/600/crop/900/noanimate/wait/4/${url}`;
  try {
    const res = await fetchConTimeout(screenshotUrl, 12000);
    if (!res.ok) return null;
    const mediaType = res.headers.get("content-type") ?? "image/png";
    const imagenBase64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    return { imagenBase64, mediaType, screenshotUrl };
  } catch {
    return null;
  }
}

// Respaldo si thum.io falla o no responde: microlink.io también es
// gratuito y no requiere API key, pero en su caso la captura no viene
// directo en el cuerpo de la respuesta, sino como una URL a descargar en
// un segundo paso.
async function capturarConMicrolink(url: string): Promise<Captura | null> {
  try {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&viewport.width=600&viewport.height=900`;
    const resApi = await fetchConTimeout(apiUrl, 12000);
    if (!resApi.ok) return null;
    const datos = await resApi.json();
    const imagenUrl: unknown = datos?.data?.screenshot?.url;
    if (typeof imagenUrl !== "string") return null;

    const resImagen = await fetchConTimeout(imagenUrl, 8000);
    if (!resImagen.ok) return null;
    const mediaType = resImagen.headers.get("content-type") ?? "image/png";
    const imagenBase64 = Buffer.from(await resImagen.arrayBuffer()).toString("base64");
    return { imagenBase64, mediaType, screenshotUrl: imagenUrl };
  } catch {
    return null;
  }
}

async function obtenerCaptura(url: string): Promise<Captura | null> {
  return (await capturarConThumIo(url)) ?? (await capturarConMicrolink(url));
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
// rendirse. El timeout por intento se calcula a partir del presupuesto de
// tiempo que quedó disponible después de obtener la captura, para no
// superar el maxDuration del endpoint incluso cuando la captura tardó más
// de lo normal (por ejemplo, si tuvo que recurrir al respaldo).
async function generarAnalisisCRO(
  imagenBase64: string,
  mediaType: string,
  presupuestoMs: number
): Promise<RespuestaCRO> {
  let ultimoError = "No pudimos analizar visualmente tu sitio. Intenta de nuevo.";
  const timeoutPorIntento = Math.max(8000, Math.min(20000, Math.floor(presupuestoMs / 2)));

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
          httpOptions: { timeout: timeoutPorIntento, retryOptions: { attempts: 1 } },
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
  const inicio = Date.now();

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

  const captura = await obtenerCaptura(url);
  if (!captura) {
    return Response.json(
      respuestaVacia("No pudimos obtener una captura de tu sitio. Intenta de nuevo en unos minutos.")
    );
  }

  const presupuestoRestante = 58000 - (Date.now() - inicio);

  let datos: RespuestaCRO;
  try {
    datos = await generarAnalisisCRO(captura.imagenBase64, captura.mediaType, presupuestoRestante);
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

  const resultado: AnalisisCRO = { ok: true, screenshotUrl: captura.screenshotUrl, dimensiones };
  return Response.json(resultado);
}
