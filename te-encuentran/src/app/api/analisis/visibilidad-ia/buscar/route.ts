import { ia, MODELO_TEXTO } from "@/lib/visibilidad-ia";

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
    const respuesta = await ia.models.generateContent({
      model: MODELO_TEXTO,
      contents: pregunta,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const texto = respuesta.text ?? "";

    return Response.json({ ok: true, pregunta, respuesta: texto });
  } catch (error) {
    console.error("Error buscando respuesta de visibilidad IA:", error);
    // TEMPORAL: exponemos el detalle para diagnosticar, se revierte después.
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      pregunta,
      respuesta: "",
    });
  }
}
