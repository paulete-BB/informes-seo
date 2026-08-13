import { CONFIG_ESTANDAR, extraerJson, generarConFallback } from "@/lib/visibilidad-ia";
import {
  AnalisisCRO,
  AnalisisPageSpeed,
  AnalisisTecnico,
  EstadoSemaforo,
  PlanAccionCRO,
  TareaPlanAccion,
} from "@/lib/tipos";

export const maxDuration = 30;

function respuestaVacia(error: string): PlanAccionCRO {
  return { ok: false, error, tareas: [] };
}

interface RespuestaModelo {
  tareas?: Array<{
    tarea?: string;
    porQueImporta?: string;
    esfuerzo?: string;
    urgencia?: string;
  }>;
}

const URGENCIAS_VALIDAS: EstadoSemaforo[] = ["ok", "alerta", "critico"];

export async function POST(request: Request) {
  let body: {
    tecnico?: AnalisisTecnico;
    pagespeed?: AnalisisPageSpeed;
    cro?: AnalisisCRO;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json(respuestaVacia("Solicitud inválida."));
  }

  const { tecnico, pagespeed, cro } = body;
  if (!tecnico?.ok && !pagespeed?.ok && !cro?.ok) {
    return Response.json(respuestaVacia("No hay suficientes datos para armar un plan de acción."));
  }

  const bloques: string[] = [];

  if (tecnico?.ok) {
    bloques.push(
      "Estructura técnica:\n" +
        tecnico.hallazgos
          .map((h) => `- [${h.estado}] ${h.titulo}: ${h.explicacion}`)
          .join("\n")
    );
  }

  if (pagespeed?.ok) {
    bloques.push(
      `Velocidad (PageSpeed): performance=${pagespeed.scorePerformance}, seo=${pagespeed.scoreSeo}, accesibilidad=${pagespeed.scoreAccesibilidad}\n` +
        pagespeed.metricas.map((m) => `- [${m.estado}] ${m.nombre} (${m.valor}): ${m.explicacion}`).join("\n")
    );
  }

  if (cro?.ok) {
    bloques.push(
      "Primera impresión (visual):\n" +
        cro.dimensiones
          .map((d) => `- ${d.nombre} (score ${d.score}/100): ${d.veredicto}\n  ${d.hallazgos.join("\n  ")}`)
          .join("\n")
    );
  }

  try {
    const respuesta = await generarConFallback({
      contents: `Eres un consultor CRO que le va a armar una cotización de trabajo a un cliente. Con estos hallazgos técnicos, de velocidad y visuales de su sitio web, genera entre 5 y 8 tareas concretas de optimización, priorizadas por impacto sobre esfuerzo.

${bloques.join("\n\n")}

Para cada tarea da:
- tarea: qué hay que hacer, específico y accionable (no genérico)
- porQueImporta: por qué importa en plata o clientes perdidos, no en jerga técnica
- esfuerzo: "minutos", "horas", o "requiere ayuda técnica"
- urgencia: "critico", "alerta", u "ok" según qué tan urgente es

Responde ÚNICAMENTE con un JSON válido con esta forma exacta, sin texto adicional ni bloques de código:
{"tareas": [{"tarea": "...", "porQueImporta": "...", "esfuerzo": "...", "urgencia": "critico"}, ...]}`,
      config: CONFIG_ESTANDAR,
    });

    const texto = respuesta.text;
    if (!texto) {
      return Response.json(respuestaVacia("No pudimos generar el plan de acción."));
    }

    const datos = extraerJson(texto) as RespuestaModelo;
    const tareas: TareaPlanAccion[] = (datos.tareas ?? [])
      .filter((t) => t.tarea && t.porQueImporta && t.esfuerzo)
      .map((t) => ({
        tarea: t.tarea!,
        porQueImporta: t.porQueImporta!,
        esfuerzo: t.esfuerzo!,
        urgencia: URGENCIAS_VALIDAS.includes(t.urgencia as EstadoSemaforo)
          ? (t.urgencia as EstadoSemaforo)
          : "alerta",
      }));

    if (tareas.length === 0) {
      return Response.json(respuestaVacia("No pudimos generar el plan de acción."));
    }

    return Response.json({ ok: true, tareas } satisfies PlanAccionCRO);
  } catch (error) {
    console.error("Error generando plan de acción CRO:", error);
    return Response.json(respuestaVacia("No pudimos generar el plan de acción. Intenta de nuevo."));
  }
}
