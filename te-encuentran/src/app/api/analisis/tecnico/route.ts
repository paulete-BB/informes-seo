import * as cheerio from "cheerio";
import { AnalisisTecnico, EstadoSemaforo, Hallazgo, Plataforma } from "@/lib/tipos";

export const maxDuration = 60;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchConTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function existeArchivo(
  origen: string,
  ruta: string
): Promise<{ existe: boolean; contenido?: string }> {
  try {
    const res = await fetchConTimeout(`${origen}${ruta}`, 8000);
    if (!res.ok) return { existe: false };
    return { existe: true, contenido: await res.text() };
  } catch {
    return { existe: false };
  }
}

function revisarTituloYDescripcion($: cheerio.CheerioAPI): Hallazgo {
  const titulo = $("title").first().text().trim();
  const descripcion = ($('meta[name="description"]').attr("content") ?? "").trim();
  const problemas: string[] = [];

  if (!titulo) {
    problemas.push("no tiene título");
  } else if (/^(inicio|home|index)$/i.test(titulo) || titulo.length < 10) {
    problemas.push(`el título ("${titulo}") es muy genérico o corto`);
  }

  if (!descripcion) {
    problemas.push("no tiene descripción para buscadores");
  } else if (descripcion.length < 50 || descripcion.length > 160) {
    problemas.push("la descripción tiene un largo poco recomendable");
  }

  if (problemas.length === 0) {
    return {
      id: "titulo-descripcion",
      titulo: "Título y descripción de la página",
      estado: "ok",
      explicacion: `Tu título ("${titulo}") y tu descripción están bien definidos. Eso es lo que la gente ve primero en Google.`,
    };
  }

  const estado: EstadoSemaforo = !titulo && !descripcion ? "critico" : "alerta";
  return {
    id: "titulo-descripcion",
    titulo: "Título y descripción de la página",
    estado,
    explicacion: `Tu página ${problemas.join(" y ")}. Esto es lo primero que lee alguien en Google: si no dice qué vendes ni dónde estás, pierdes el clic antes de que entre a tu web.`,
  };
}

function revisarEncabezados($: cheerio.CheerioAPI): Hallazgo {
  const encabezados = $("h1, h2, h3, h4, h5, h6")
    .map((_, el) => Number(el.tagName.slice(1)))
    .get();
  const cantidadH1 = encabezados.filter((n) => n === 1).length;

  if (cantidadH1 === 0) {
    return {
      id: "encabezados",
      titulo: "Encabezado principal (H1)",
      estado: "critico",
      explicacion:
        "No encontramos un encabezado principal (H1) en tu página. Es como un local sin letrero: a Google le cuesta más entender de qué trata tu negocio.",
    };
  }

  if (cantidadH1 > 1) {
    return {
      id: "encabezados",
      titulo: "Encabezado principal (H1)",
      estado: "alerta",
      explicacion: `Tu página tiene ${cantidadH1} encabezados principales (H1). Debería haber solo uno: así Google sabe cuál es el tema central de la página.`,
    };
  }

  let maxNivel = 1;
  let hayOrdenIlogico = false;
  for (const nivel of encabezados) {
    if (nivel > maxNivel + 1) hayOrdenIlogico = true;
    maxNivel = Math.max(maxNivel, nivel);
  }

  if (hayOrdenIlogico) {
    return {
      id: "encabezados",
      titulo: "Encabezado principal (H1)",
      estado: "alerta",
      explicacion:
        "Tienes un H1, pero el orden de los subtítulos salta niveles (por ejemplo, de H1 a H3 sin H2). No es grave, pero ordenarlo ayuda a que Google entienda mejor tu contenido.",
    };
  }

  return {
    id: "encabezados",
    titulo: "Encabezado principal (H1)",
    estado: "ok",
    explicacion: "Tienes un solo encabezado principal y el orden de los subtítulos es lógico. Bien.",
  };
}

function revisarSchema($: cheerio.CheerioAPI): Hallazgo {
  const bloques = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).contents().text())
    .get();

  let tieneLocalBusinessUOrg = false;

  for (const bloque of bloques) {
    try {
      const datos = JSON.parse(bloque);
      const items = Array.isArray(datos) ? datos : [datos];
      for (const item of items) {
        const grafo = Array.isArray(item?.["@graph"]) ? item["@graph"] : [];
        const tipos = [item?.["@type"], ...grafo.map((g: Record<string, unknown>) => g?.["@type"])]
          .flat()
          .filter(Boolean)
          .map((t) => String(t));
        if (tipos.some((t) => /LocalBusiness|Organization/i.test(t))) {
          tieneLocalBusinessUOrg = true;
        }
      }
    } catch {
      // JSON inválido, lo ignoramos.
    }
  }

  if (tieneLocalBusinessUOrg) {
    return {
      id: "schema",
      titulo: "Datos estructurados (Schema.org)",
      estado: "ok",
      explicacion:
        "Tu sitio le informa a Google, en un formato que entiende, que eres un negocio (LocalBusiness u Organization). Esto ayuda a aparecer en el mapa y en las respuestas de la IA.",
    };
  }

  if (bloques.length > 0) {
    return {
      id: "schema",
      titulo: "Datos estructurados (Schema.org)",
      estado: "alerta",
      explicacion:
        "Tu sitio tiene algunos datos estructurados, pero no identifican tu negocio como LocalBusiness u Organization. Agregar ese dato ayuda a que Google y la IA sepan exactamente qué eres.",
    };
  }

  return {
    id: "schema",
    titulo: "Datos estructurados (Schema.org)",
    estado: "critico",
    explicacion:
      "Tu sitio no tiene datos estructurados. Es información invisible que le dice a Google cuál es tu dirección, horario y tipo de negocio. Sin ella, es mucho más difícil que aparezcas en el mapa o en las respuestas de la IA.",
  };
}

function revisarRobots(contenido: string | undefined): Hallazgo {
  if (contenido === undefined) {
    return {
      id: "robots",
      titulo: "Archivo robots.txt",
      estado: "alerta",
      explicacion:
        "No encontramos un archivo robots.txt. No es grave (Google puede rastrear tu sitio igual), pero es una buena práctica tenerlo para controlar qué puede revisar.",
    };
  }

  const bloqueaTodo = /Disallow:\s*\/\s*($|\n)/im.test(contenido);

  if (bloqueaTodo) {
    return {
      id: "robots",
      titulo: "Archivo robots.txt",
      estado: "critico",
      explicacion:
        "Tu robots.txt está bloqueando a Google para que revise tu sitio completo. Esto puede ser la razón por la que no apareces en las búsquedas.",
    };
  }

  return {
    id: "robots",
    titulo: "Archivo robots.txt",
    estado: "ok",
    explicacion: "Existe y no está bloqueando nada importante. Google puede entrar a leer tu sitio sin problemas.",
  };
}

function revisarSitemap(existe: boolean): Hallazgo {
  if (existe) {
    return {
      id: "sitemap",
      titulo: "Mapa del sitio (sitemap.xml)",
      estado: "ok",
      explicacion: "Existe un mapa del sitio. Esto ayuda a que Google encuentre todas tus páginas más rápido.",
    };
  }
  return {
    id: "sitemap",
    titulo: "Mapa del sitio (sitemap.xml)",
    estado: "alerta",
    explicacion:
      "No encontramos un mapa del sitio (sitemap.xml). Es la lista de todas tus páginas que le entregas a Google para que no se pierda ninguna.",
  };
}

function revisarLlms(existe: boolean): Hallazgo {
  if (existe) {
    return {
      id: "llms",
      titulo: "Archivo para la IA (llms.txt)",
      estado: "ok",
      explicacion:
        "Tienes un archivo llms.txt. Es un estándar nuevo que le explica a las IAs como ChatGPT de qué trata tu sitio. Todavía casi nadie lo tiene: es una ventaja.",
    };
  }
  return {
    id: "llms",
    titulo: "Archivo para la IA (llms.txt)",
    estado: "alerta",
    explicacion:
      "No tienes un archivo llms.txt. Es un estándar nuevo (2024) que le explica a las IAs como ChatGPT qué haces. Casi nadie lo tiene todavía: ponerlo hoy te adelanta a tu competencia.",
  };
}

function revisarContacto($: cheerio.CheerioAPI, html: string): Hallazgo {
  const tieneTelefono = /(\+?56)?[\s.-]?9\s?\d{4}[\s.-]?\d{4}/.test(html) || /tel:/i.test(html);
  const tieneWhatsapp = /wa\.me|api\.whatsapp\.com|whatsapp/i.test(html);
  const tieneFormulario = $("form").length > 0;
  const tieneEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(html) || /mailto:/i.test(html);

  const encontrados = [
    tieneTelefono && "teléfono",
    tieneWhatsapp && "WhatsApp",
    tieneFormulario && "formulario de contacto",
    tieneEmail && "email",
  ].filter(Boolean) as string[];

  if (encontrados.length >= 2) {
    return {
      id: "contacto",
      titulo: "Cómo te contactan",
      estado: "ok",
      explicacion: `Encontramos: ${encontrados.join(", ")}. Eso genera confianza y facilita que te escriban.`,
    };
  }

  if (encontrados.length === 1) {
    return {
      id: "contacto",
      titulo: "Cómo te contactan",
      estado: "alerta",
      explicacion: `Solo encontramos ${encontrados[0]} como forma de contacto. Mientras más fácil sea contactarte, más consultas conviertes en clientes.`,
    };
  }

  return {
    id: "contacto",
    titulo: "Cómo te contactan",
    estado: "critico",
    explicacion:
      "No encontramos ninguna forma clara de contacto (teléfono, WhatsApp, formulario o email). Si alguien no sabe cómo escribirte, se va a la competencia.",
  };
}

function revisarConfianza(html: string): Hallazgo {
  const texto = html.toLowerCase();
  const tieneDireccion = /\b(av\.|avenida|calle|pasaje|camino)\b/.test(texto);
  const tieneRut = /\d{1,2}\.\d{3}\.\d{3}-[\dk]/i.test(html);
  const tieneTestimonios = /testimonio|opinion|reseñ|review/i.test(texto);
  const tienePoliticas =
    /pol[íi]tica de privacidad|t[ée]rminos y condiciones|pol[íi]tica de devoluci[óo]n/i.test(texto);
  const tienePagos = /webpay|mercado pago|transferencia bancaria|tarjeta de cr[ée]dito|flow\.cl/i.test(texto);

  const encontrados = [
    tieneDireccion && "dirección física",
    tieneRut && "RUT",
    tieneTestimonios && "testimonios",
    tienePoliticas && "políticas de privacidad o devolución",
    tienePagos && "medios de pago",
  ].filter(Boolean) as string[];

  if (encontrados.length >= 3) {
    return {
      id: "confianza",
      titulo: "Señales de confianza",
      estado: "ok",
      explicacion: `Tu sitio muestra: ${encontrados.join(", ")}. Eso ayuda a que un cliente nuevo confíe y se decida.`,
    };
  }

  if (encontrados.length >= 1) {
    return {
      id: "confianza",
      titulo: "Señales de confianza",
      estado: "alerta",
      explicacion: `Encontramos ${encontrados.join(", ")}, pero faltan otras señales de confianza. Mientras más se note que eres un negocio real, más fácil es que alguien nuevo te elija.`,
    };
  }

  return {
    id: "confianza",
    titulo: "Señales de confianza",
    estado: "critico",
    explicacion:
      "No encontramos señales de confianza (dirección, testimonios, políticas, medios de pago). Sin ellas, cuesta más que alguien que no te conoce decida comprarte.",
  };
}

function respuestaVacia(error: string): AnalisisTecnico {
  return { ok: false, error, score: 0, hallazgos: [], plataforma: null };
}

// Firmas de plataformas conocidas: se revisan en orden porque algunas
// (Next.js, por ejemplo) son un indicio genérico que solo debería ganar
// si no hay una plataforma de arriendo más específica antes.
const FIRMAS_PLATAFORMA: Array<{
  nombre: string;
  detalle: string;
  test: (html: string, headers: Headers) => boolean;
}> = [
  {
    nombre: "WordPress",
    detalle: "Detectado por rutas propias de WordPress (wp-content, wp-json) o su etiqueta de generador.",
    test: (html) => /wp-content|wp-includes|\/wp-json\//i.test(html) || /generator["'][^>]*wordpress/i.test(html),
  },
  {
    nombre: "Shopify",
    detalle: "Detectado por scripts y dominios propios de Shopify.",
    test: (html, headers) =>
      /cdn\.shopify\.com|myshopify\.com|Shopify\.theme/i.test(html) || Boolean(headers.get("x-shopid")),
  },
  {
    nombre: "Wix",
    detalle: "Detectado por scripts propios de Wix o su cabecera de servidor.",
    test: (html, headers) =>
      /static\.wixstatic\.com|parastorage\.com/i.test(html) ||
      /wix/i.test(headers.get("x-wix-request-id") ?? "") ||
      /wix/i.test(headers.get("server") ?? ""),
  },
  {
    nombre: "Squarespace",
    detalle: "Detectado por dominios de recursos propios de Squarespace.",
    test: (html) => /squarespace\.com|static1\.squarespace\.com/i.test(html),
  },
  {
    nombre: "Webflow",
    detalle: "Detectado por el atributo data-wf-site propio de Webflow.",
    test: (html) => /data-wf-site|assets\.website-files\.com/i.test(html),
  },
  {
    nombre: "Tienda Nube / Nuvemshop",
    detalle: "Detectado por scripts propios de Tienda Nube.",
    test: (html) => /tiendanube\.com|nuvemshop/i.test(html),
  },
  {
    nombre: "Jimdo",
    detalle: "Detectado por dominios propios de Jimdo.",
    test: (html) => /jimdo\.com/i.test(html),
  },
  {
    nombre: "Joomla",
    detalle: "Detectado por su etiqueta de generador.",
    test: (html) => /generator["'][^>]*joomla/i.test(html),
  },
  {
    nombre: "Drupal",
    detalle: "Detectado por su etiqueta de generador o rutas propias de Drupal.",
    test: (html) => /generator["'][^>]*drupal/i.test(html) || /sites\/default\/files/i.test(html),
  },
  {
    nombre: "Magento",
    detalle: "Detectado por scripts propios de Magento.",
    test: (html) => /Mage\.Cookies|\/static\/version\d+\/frontend/i.test(html),
  },
  {
    nombre: "PrestaShop",
    detalle: "Detectado por su etiqueta de generador.",
    test: (html) => /generator["'][^>]*prestashop/i.test(html),
  },
  {
    nombre: "Next.js (desarrollo a medida)",
    detalle: "Detectado por el bundle de Next.js (_next/static). No es una plataforma de arriendo, es un sitio construido a medida.",
    test: (html) => /_next\/static|__NEXT_DATA__/i.test(html),
  },
];

function detectarPlataforma(html: string, headers: Headers): Plataforma | null {
  for (const firma of FIRMAS_PLATAFORMA) {
    if (firma.test(html, headers)) {
      return { nombre: firma.nombre, detalle: firma.detalle };
    }
  }
  return null;
}

const PESO_ESTADO: Record<EstadoSemaforo, number> = { ok: 100, alerta: 50, critico: 0 };

function calcularScore(hallazgos: Hallazgo[]): number {
  const suma = hallazgos.reduce((acc, h) => acc + PESO_ESTADO[h.estado], 0);
  return Math.round(suma / hallazgos.length);
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

  let origen: string;
  try {
    origen = new URL(url).origin;
  } catch {
    return Response.json(respuestaVacia("La URL no es válida."));
  }

  let html: string;
  let headers: Headers;
  try {
    const res = await fetchConTimeout(url, 10000);
    if (!res.ok) {
      return Response.json(
        respuestaVacia(`Tu sitio respondió con un error (código ${res.status}). Revisa que la URL esté bien escrita.`)
      );
    }
    headers = res.headers;
    html = await res.text();
  } catch {
    return Response.json(
      respuestaVacia("No pudimos acceder a tu sitio. Revisa que la URL esté bien escrita y que el sitio esté funcionando.")
    );
  }

  const plataforma = detectarPlataforma(html, headers);
  const $ = cheerio.load(html);

  const [robots, sitemap, llms] = await Promise.all([
    existeArchivo(origen, "/robots.txt"),
    existeArchivo(origen, "/sitemap.xml"),
    existeArchivo(origen, "/llms.txt"),
  ]);

  const hallazgos: Hallazgo[] = [
    revisarTituloYDescripcion($),
    revisarEncabezados($),
    revisarSchema($),
    revisarRobots(robots.contenido),
    revisarSitemap(sitemap.existe),
    revisarLlms(llms.existe),
    revisarContacto($, html),
    revisarConfianza(html),
  ];

  const resultado: AnalisisTecnico = { ok: true, score: calcularScore(hallazgos), hallazgos, plataforma };
  return Response.json(resultado);
}
