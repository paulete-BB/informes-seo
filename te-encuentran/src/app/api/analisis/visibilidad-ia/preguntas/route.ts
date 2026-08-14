import * as cheerio from "cheerio";
import { CONFIG_RAPIDA, extraerJson, fetchConTimeout, generarConFallback } from "@/lib/visibilidad-ia";

export const maxDuration = 30;

// Sin esto, las preguntas solo se basan en el rubro genérico que escribió
// la persona en el formulario (ej. "agencia de marketing"), y salen
// preguntas de manual en vez de preguntas específicas a lo que el negocio
// realmente ofrece. Con el título y la descripción de su propio sitio, el
// modelo puede afinar mucho más las preguntas.
async function obtenerContextoSitio(url: string): Promise<string | null> {
  try {
    const res = await fetchConTimeout(url, 8000);
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const titulo = $("title").first().text().trim();
    const descripcion = ($('meta[name="description"]').attr("content") ?? "").trim();
    if (!titulo && !descripcion) return null;
    return [titulo && `Título del sitio: "${titulo}"`, descripcion && `Descripción del sitio: "${descripcion}"`]
      .filter(Boolean)
      .join("\n");
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: { url?: string; rubro?: string; ciudad?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Solicitud inválida.", preguntas: [] });
  }

  const { url, rubro, ciudad } = body;
  if (!rubro || !ciudad) {
    return Response.json({ ok: false, error: "Faltan datos para generar las preguntas.", preguntas: [] });
  }

  const contextoSitio = url ? await obtenerContextoSitio(url) : null;

  try {
    const respuesta = await generarConFallback({
      contents: `Genera exactamente 5 preguntas realistas y específicas que una persona de verdad le escribiría a ChatGPT cuando está buscando "${rubro}" en "${ciudad}". No nombres ningún negocio específico.
${
  contextoSitio
    ? `\nEsto es lo que el negocio dice de sí mismo en su propio sitio web. Úsalo para que las preguntas apunten a lo que realmente ofrece, no preguntas genéricas del rubro:\n${contextoSitio}\n`
    : ""
}
Mezcla estos tipos de intención, sin repetir el mismo ángulo dos veces:
- Descubrimiento: "¿dónde puedo encontrar...?"
- Comparación: "¿cuál es mejor...?"
- Recomendación directa: "recomiéndame..."
- Con un problema concreto: "se me rompió X, ¿qué hago?"

Prioriza calidad sobre cantidad: cada pregunta debe sonar como la escribiría una persona real con una necesidad concreta y específica a este tipo de negocio, no una pregunta genérica de buscador.

Responde ÚNICAMENTE con un JSON válido con esta forma exacta, sin texto adicional ni bloques de código: {"preguntas": ["...", "..."]}`,
      config: CONFIG_RAPIDA,
    });

    const texto = respuesta.text;
    if (!texto) {
      return Response.json({ ok: false, error: "No pudimos generar las preguntas.", preguntas: [] });
    }
    const datos = extraerJson(texto) as { preguntas?: unknown };
    const preguntas = Array.isArray(datos.preguntas) ? datos.preguntas : [];
    if (preguntas.length === 0) {
      return Response.json({ ok: false, error: "No pudimos generar las preguntas.", preguntas: [] });
    }
    return Response.json({ ok: true, preguntas });
  } catch (error) {
    console.error("Error generando preguntas de visibilidad IA:", error);
    return Response.json({
      ok: false,
      error: "No pudimos generar las preguntas de prueba.",
      preguntas: [],
    });
  }
}
