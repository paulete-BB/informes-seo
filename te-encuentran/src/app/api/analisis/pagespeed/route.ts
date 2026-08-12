import { AnalisisPageSpeed, EstadoSemaforo, MetricaPageSpeed } from "@/lib/tipos";

export const maxDuration = 60;

interface AuditoriaPSI {
  numericValue?: number;
  displayValue?: string;
}

interface RespuestaPSI {
  lighthouseResult?: {
    categories?: {
      performance?: { score?: number };
      seo?: { score?: number };
      accessibility?: { score?: number };
    };
    audits?: {
      "largest-contentful-paint"?: AuditoriaPSI;
      "cumulative-layout-shift"?: AuditoriaPSI;
      "total-blocking-time"?: AuditoriaPSI;
    };
  };
  error?: { message?: string };
}

function respuestaVacia(error: string): AnalisisPageSpeed {
  return {
    ok: false,
    error,
    scorePerformance: 0,
    scoreSeo: 0,
    scoreAccesibilidad: 0,
    metricas: [],
  };
}

function evaluarLcp(ms: number, valorTexto: string): MetricaPageSpeed {
  let estado: EstadoSemaforo;
  let frase: string;
  if (ms <= 2500) {
    estado = "ok";
    frase = "Está dentro de lo recomendado: la mayoría de las personas no se va antes de que cargue.";
  } else if (ms <= 4000) {
    estado = "alerta";
    frase = "Podría ser más rápido: algunas personas empiezan a impacientarse antes de que aparezca.";
  } else {
    estado = "critico";
    frase = "Más de la mitad de las personas se va antes de que aparezca.";
  }
  return {
    id: "lcp",
    nombre: "Velocidad de carga",
    valor: valorTexto,
    estado,
    explicacion: `Tu sitio tarda ${valorTexto} en mostrar lo primero que la persona ve, desde el celular. ${frase}`,
  };
}

function evaluarCls(valor: number, valorTexto: string): MetricaPageSpeed {
  let estado: EstadoSemaforo;
  let frase: string;
  if (valor <= 0.1) {
    estado = "ok";
    frase = "Los elementos de tu página se mantienen estables mientras carga.";
  } else if (valor <= 0.25) {
    estado = "alerta";
    frase = "Los elementos de tu página se mueven un poco mientras carga. Puede pasar que alguien toque algo sin querer.";
  } else {
    estado = "critico";
    frase = "Los elementos de tu página se mueven bastante mientras carga. Es común que alguien toque un botón equivocado y se frustre.";
  }
  return {
    id: "cls",
    nombre: "Estabilidad visual",
    valor: valorTexto,
    estado,
    explicacion: frase,
  };
}

function evaluarTbt(ms: number, valorTexto: string): MetricaPageSpeed {
  let estado: EstadoSemaforo;
  let frase: string;
  if (ms <= 200) {
    estado = "ok";
    frase = "Tu sitio responde rápido cuando alguien toca un botón.";
  } else if (ms <= 600) {
    estado = "alerta";
    frase = "Cuando alguien toca un botón, tu sitio tarda un poco en reaccionar.";
  } else {
    estado = "critico";
    frase = "Cuando alguien toca un botón, tu sitio tarda en reaccionar. Se siente pegado o lento, aunque ya haya cargado.";
  }
  return {
    id: "tbt",
    nombre: "Tiempo de respuesta",
    valor: valorTexto,
    estado,
    explicacion: frase,
  };
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

  const params = new URLSearchParams({ url, strategy: "mobile" });
  params.append("category", "performance");
  params.append("category", "seo");
  params.append("category", "accessibility");
  params.append("category", "best-practices");
  const apiKey = process.env.GOOGLE_PAGESPEED_KEY;
  if (apiKey) params.append("key", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  let datos: RespuestaPSI;
  try {
    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`,
      { signal: controller.signal }
    );
    datos = await res.json();
    if (!res.ok) {
      return Response.json(
        respuestaVacia(
          datos.error?.message ??
            "Google no pudo medir la velocidad de tu sitio. Revisa que la URL esté bien escrita."
        )
      );
    }
  } catch {
    return Response.json(
      respuestaVacia("No pudimos medir la velocidad de tu sitio. Puede tardar mucho o estar caído; intenta de nuevo.")
    );
  } finally {
    clearTimeout(timeout);
  }

  const categorias = datos.lighthouseResult?.categories;
  const audits = datos.lighthouseResult?.audits;

  if (!categorias || !audits) {
    return Response.json(
      respuestaVacia("Google no devolvió resultados de velocidad para esta URL.")
    );
  }

  const scorePerformance = Math.round((categorias.performance?.score ?? 0) * 100);
  const scoreSeo = Math.round((categorias.seo?.score ?? 0) * 100);
  const scoreAccesibilidad = Math.round((categorias.accessibility?.score ?? 0) * 100);

  const lcp = audits["largest-contentful-paint"];
  const cls = audits["cumulative-layout-shift"];
  const tbt = audits["total-blocking-time"];

  const metricas: MetricaPageSpeed[] = [
    evaluarLcp(lcp?.numericValue ?? 0, lcp?.displayValue ?? "sin datos"),
    evaluarCls(cls?.numericValue ?? 0, cls?.displayValue ?? "sin datos"),
    evaluarTbt(tbt?.numericValue ?? 0, tbt?.displayValue ?? "sin datos"),
  ];

  const resultado: AnalisisPageSpeed = {
    ok: true,
    scorePerformance,
    scoreSeo,
    scoreAccesibilidad,
    metricas,
  };
  return Response.json(resultado);
}
