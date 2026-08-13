import { CONFIG_RAPIDA, extraerJson, ia, MODELO_TEXTO } from "@/lib/visibilidad-ia";

export const maxDuration = 30;

export async function POST(request: Request) {
  let body: { rubro?: string; ciudad?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Solicitud inválida.", preguntas: [] });
  }

  const { rubro, ciudad } = body;
  if (!rubro || !ciudad) {
    return Response.json({ ok: false, error: "Faltan datos para generar las preguntas.", preguntas: [] });
  }

  try {
    const respuesta = await ia.models.generateContent({
      model: MODELO_TEXTO,
      contents: `Genera exactamente 10 preguntas realistas que una persona de verdad le escribiría a ChatGPT cuando está buscando "${rubro}" en "${ciudad}". No nombres ningún negocio específico.

Mezcla estos tipos de intención (al menos 2 de cada uno):
- Descubrimiento: "¿dónde puedo encontrar...?"
- Comparación: "¿cuál es mejor...?"
- Recomendación directa: "recomiéndame..."
- Con un problema concreto: "se me rompió X, ¿qué hago?"

Las preguntas deben sonar naturales, como las escribiría una persona real, no un buscador.

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
    return Response.json({ ok: false, error: "No pudimos generar las preguntas de prueba.", preguntas: [] });
  }
}
