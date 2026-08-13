import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";

// "gemini-flash-latest" apunta hoy a un modelo recién lanzado
// (gemini-3.6-flash) cuya cuota gratis es de solo 20 solicitudes/día.
// "gemini-flash-lite-latest" apunta a la variante "lite", ya establecida,
// con cuota gratuita mucho mayor.
export const MODELO_TEXTO = "gemini-flash-lite-latest";
export const MODELO_VISION = "gemini-flash-lite-latest";

export const ia = new GoogleGenAI({});

// Reintentos acotados para no superar el límite de duración de la función
// (Vercel Hobby: 60s por invocación). Cada preset fija un timeout por
// intento para que el peor caso (todos los intentos agotando su timeout)
// quepa con margen dentro del maxDuration del endpoint que lo usa.
export const CONFIG_RAPIDA = {
  httpOptions: { timeout: 10000, retryOptions: { attempts: 2, initialDelay: 1, maxDelay: 4 } },
};

// Solo para el endpoint que no comparte su presupuesto de tiempo con otra
// llamada a la IA (buscar): más intentos y más margen por intento.
export const CONFIG_ESTANDAR = {
  httpOptions: { timeout: 15000, retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 6 } },
};

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
