import * as cheerio from "cheerio";
import { CONFIG_RAPIDA, extraerJson, fetchConTimeout, generarConFallback } from "@/lib/visibilidad-ia";

export const maxDuration = 30;

// Sin esto, las preguntas solo se basan en el rubro genérico que escribió
// la persona en el formulario (ej. "agencia de marketing"), sin nada del
// negocio real. Con el título y la descripción de su propio sitio, las
// 2 preguntas de variedad pueden ser algo más específicas sin volverse
// escenarios complejos.
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

  // Preguntas directas garantizadas: llevan a la IA a listar negocios del
  // rubro, que es justo lo que se necesita para detectar si el negocio
  // aparece o no. No dependen de que el modelo las redacte bien.
  const preguntasBase = [
    `¿Cuáles son las mejores opciones de ${rubro} en ${ciudad}?`,
    `¿Qué ${rubro} me recomiendas en ${ciudad}?`,
    `Recomiéndame algunas empresas de ${rubro} en ${ciudad}.`,
  ];

  const contextoSitio = url ? await obtenerContextoSitio(url) : null;

  let preguntasVariedad: string[] = [];
  try {
    const respuesta = await generarConFallback({
      contents: `Genera exactamente 2 preguntas cortas y simples que una persona real le escribiría a ChatGPT buscando "${rubro}" en "${ciudad}", pidiendo directamente una recomendación o lista de negocios. No nombres ningún negocio específico.
${
  contextoSitio
    ? `\nEsto es lo que el negocio dice de sí mismo en su propio sitio, úsalo solo como inspiración leve para que no sean idénticas a preguntas genéricas de rubro, sin volverlas complejas:\n${contextoSitio}\n`
    : ""
}
Reglas importantes:
- Deben sonar como algo que alguien escribe rápido en el chat, no un párrafo largo con un escenario detallado.
- El objetivo de la pregunta debe ser conseguir nombres de negocios (recomendación, comparación, o "dónde encuentro"), no un consejo genérico.
- Evita preguntas tan específicas o de nicho que la IA no pueda responder con una lista de negocios reales.

Responde ÚNICAMENTE con un JSON válido con esta forma exacta, sin texto adicional ni bloques de código: {"preguntas": ["...", "..."]}`,
      config: CONFIG_RAPIDA,
    });

    const texto = respuesta.text;
    if (texto) {
      const datos = extraerJson(texto) as { preguntas?: unknown };
      if (Array.isArray(datos.preguntas)) {
        preguntasVariedad = datos.preguntas.filter((p): p is string => typeof p === "string");
      }
    }
  } catch (error) {
    console.error("Error generando preguntas de variedad:", error);
    // Seguimos solo con las preguntas base; no es un fallo crítico.
  }

  const preguntas = [...preguntasBase, ...preguntasVariedad].slice(0, 5);

  return Response.json({ ok: true, preguntas });
}
