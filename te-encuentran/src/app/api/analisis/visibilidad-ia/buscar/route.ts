import { client } from "@/lib/visibilidad-ia";

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
    const respuesta = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages: [{ role: "user", content: pregunta }],
    });

    const texto = respuesta.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n\n");

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
