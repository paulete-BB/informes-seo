import { buscarEnTavily, CONFIG_ESTANDAR, generarConFallback } from "@/lib/visibilidad-ia";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { pregunta?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Solicitud inválida.", respuesta: "" });
  }

  const { pregunta } = body;
  if (!pregunta) {
    return Response.json({ ok: false, error: "Falta la pregunta a buscar.", respuesta: "" });
  }

  try {
    const resultados = await buscarEnTavily(pregunta);

    const contexto =
      resultados.length > 0
        ? resultados
            .map((r, i) => `${i + 1}. ${r.titulo}\n${r.contenido}\n(fuente: ${r.url})`)
            .join("\n\n")
        : "La búsqueda no encontró resultados relevantes para esta pregunta.";

    const respuesta = await generarConFallback({
      contents: `Actúa como un asistente de IA (como ChatGPT) respondiendo la pregunta de una persona real. Usa ÚNICAMENTE la siguiente información de búsqueda web reciente para responder; no inventes ni asumas negocios que no aparezcan en estos resultados:

${contexto}

Pregunta de la persona: "${pregunta}"

Responde de forma natural y útil, como lo haría un asistente de IA, mencionando negocios específicos solo si aparecen respaldados por los resultados de arriba.`,
      config: CONFIG_ESTANDAR,
    });

    const texto = respuesta.text ?? "";

    return Response.json({ ok: true, pregunta, respuesta: texto });
  } catch (error) {
    console.error("Error buscando respuesta de visibilidad IA:", error);
    return Response.json({
      ok: false,
      error: "No pudimos obtener una respuesta para esta pregunta.",
      pregunta,
      respuesta: "",
    });
  }
}
