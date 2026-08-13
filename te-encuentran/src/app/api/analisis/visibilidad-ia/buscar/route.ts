import { CONFIG_ESTANDAR, generarConFallback } from "@/lib/visibilidad-ia";

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
    const respuesta = await generarConFallback({
      contents: pregunta,
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
