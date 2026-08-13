import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";

export const MODELO_TEXTO = "gemini-flash-latest";
export const MODELO_VISION = "gemini-flash-latest";

export const ia = new GoogleGenAI({});

export function extraerJson(texto: string): unknown {
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(limpio);
}

export async function fetchConTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TeEncuentranBot/1.0)" },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function dominioRaiz(url: string): { hostname: string; raiz: string } {
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const raiz = hostname.split(".")[0];
  return { hostname, raiz };
}

export interface SenalesTecnicas {
  tieneSchemaNegocio: boolean;
  tieneLlmsTxt: boolean;
  contenidoEscaso: boolean;
}

export async function detectarSenalesTecnicas(url: string): Promise<SenalesTecnicas> {
  let tieneSchemaNegocio = false;
  let contenidoEscaso = true;

  try {
    const res = await fetchConTimeout(url, 8000);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const bloques = $('script[type="application/ld+json"]')
        .map((_, el) => $(el).contents().text())
        .get();
      for (const bloque of bloques) {
        try {
          const datos = JSON.parse(bloque);
          const items = Array.isArray(datos) ? datos : [datos];
          for (const item of items) {
            if (/LocalBusiness|Organization/i.test(String(item?.["@type"] ?? ""))) {
              tieneSchemaNegocio = true;
            }
          }
        } catch {
          // JSON inválido, se ignora.
        }
      }
      const palabras = $("body").text().trim().split(/\s+/).filter(Boolean);
      contenidoEscaso = palabras.length < 300;
    }
  } catch {
    // No pudimos revisar el sitio; seguimos sin estas señales.
  }

  let tieneLlmsTxt = false;
  try {
    const { hostname } = dominioRaiz(url);
    const res = await fetchConTimeout(`https://${hostname}/llms.txt`, 5000);
    tieneLlmsTxt = res.ok;
  } catch {
    // Se asume que no existe.
  }

  return { tieneSchemaNegocio, tieneLlmsTxt, contenidoEscaso };
}
