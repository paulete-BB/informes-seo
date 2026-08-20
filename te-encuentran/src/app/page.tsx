"use client";

import { useState } from "react";
import Image from "next/image";
import Formulario from "@/components/Formulario";
import EspejoGoogle from "@/components/EspejoGoogle";
import EspejoIA from "@/components/EspejoIA";
import PlanAccion from "@/components/PlanAccion";
import { estadoPorPuntaje, promedio } from "@/lib/puntajes";
import {
  AnalisisCRO,
  AnalisisPageSpeed,
  AnalisisTecnico,
  AnalisisVisibilidadIA,
  DatosFormulario,
} from "@/lib/tipos";

const CLASES_PUNTAJE_GENERAL = {
  ok: "bg-emerald-50 text-emerald-700",
  alerta: "bg-amber-50 text-amber-700",
  critico: "bg-red-50 text-red-700",
};

const ERROR_CONEXION = "No pudimos conectar con el servidor. Intenta de nuevo.";

// El plan gratuito de Gemini tiene un límite bajo de solicitudes por
// minuto (compartido entre todos los endpoints que usan IA). Este
// espaciador global asegura que nunca se disparen dos llamadas a la IA
// al mismo tiempo, sin importar de qué tarjeta vengan.
const ESPACIADO_IA_MS = 4000;
let proximoTurnoIA = 0;

function esperarTurnoIA(): Promise<void> {
  const ahora = Date.now();
  const espera = Math.max(0, proximoTurnoIA - ahora);
  proximoTurnoIA = Math.max(proximoTurnoIA, ahora) + ESPACIADO_IA_MS;
  return new Promise((resolve) => setTimeout(resolve, espera));
}

export default function Home() {
  const [datosEnviados, setDatosEnviados] = useState<DatosFormulario | null>(null);
  const [tecnico, setTecnico] = useState<AnalisisTecnico | null>(null);
  const [cargandoTecnico, setCargandoTecnico] = useState(false);
  const [pagespeed, setPagespeed] = useState<AnalisisPageSpeed | null>(null);
  const [cargandoPagespeed, setCargandoPagespeed] = useState(false);
  const [cro, setCro] = useState<AnalisisCRO | null>(null);
  const [cargandoCro, setCargandoCro] = useState(false);
  const [visibilidadIA, setVisibilidadIA] = useState<AnalisisVisibilidadIA | null>(null);
  const [cargandoVisibilidadIA, setCargandoVisibilidadIA] = useState(false);

  async function cargarTecnico(datos: DatosFormulario) {
    setCargandoTecnico(true);
    try {
      const res = await fetch("/api/analisis/tecnico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      setTecnico(await res.json());
    } catch {
      setTecnico({ ok: false, error: ERROR_CONEXION, score: 0, hallazgos: [] });
    } finally {
      setCargandoTecnico(false);
    }
  }

  async function cargarPagespeed(datos: DatosFormulario) {
    setCargandoPagespeed(true);
    try {
      const res = await fetch("/api/analisis/pagespeed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      setPagespeed(await res.json());
    } catch {
      setPagespeed({
        ok: false,
        error: ERROR_CONEXION,
        scorePerformance: 0,
        scoreSeo: 0,
        scoreAccesibilidad: 0,
        metricas: [],
      });
    } finally {
      setCargandoPagespeed(false);
    }
  }

  async function cargarCro(datos: DatosFormulario) {
    setCargandoCro(true);
    try {
      await esperarTurnoIA();
      const res = await fetch("/api/analisis/cro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      setCro(await res.json());
    } catch {
      setCro({ ok: false, error: ERROR_CONEXION, dimensiones: [] });
    } finally {
      setCargandoCro(false);
    }
  }

  async function cargarVisibilidadIA(datos: DatosFormulario) {
    setCargandoVisibilidadIA(true);
    try {
      // Paso 1: generar las preguntas de prueba.
      await esperarTurnoIA();
      const resPreguntas = await fetch("/api/analisis/visibilidad-ia/preguntas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: datos.url, rubro: datos.rubro, ciudad: datos.ciudad }),
      });
      const datosPreguntas = await resPreguntas.json();
      const preguntas: string[] = datosPreguntas.preguntas ?? [];
      if (preguntas.length === 0) {
        throw new Error(datosPreguntas.error ?? "No se generaron preguntas.");
      }

      // Paso 2: cada pregunta se busca en su propia llamada, usando el
      // mismo espaciador global para no chocar con el límite de
      // solicitudes por minuto del plan gratuito de Gemini.
      const resultadosBusqueda = await Promise.all(
        preguntas.map(async (pregunta) => {
          await esperarTurnoIA();
          try {
            const res = await fetch("/api/analisis/visibilidad-ia/buscar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pregunta }),
            });
            const datos = await res.json();
            return { pregunta, respuesta: datos.ok ? datos.respuesta : "" };
          } catch {
            return { pregunta, respuesta: "" };
          }
        })
      );

      // Paso 3: evaluar todas las respuestas juntas.
      await esperarTurnoIA();
      const resEvaluar = await fetch("/api/analisis/visibilidad-ia/evaluar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: datos.url,
          rubro: datos.rubro,
          ciudad: datos.ciudad,
          resultados: resultadosBusqueda,
        }),
      });
      setVisibilidadIA(await resEvaluar.json());
    } catch {
      setVisibilidadIA({
        ok: false,
        error: ERROR_CONEXION,
        scoreVisibilidad: 0,
        totalPreguntas: 0,
        preguntas: [],
        competidores: [],
        porQueNoTeMencionan: [],
      });
    } finally {
      setCargandoVisibilidadIA(false);
    }
  }

  function manejarEnvio(datos: DatosFormulario) {
    setDatosEnviados(datos);
    setTecnico(null);
    setPagespeed(null);
    setCro(null);
    setVisibilidadIA(null);
    // Se disparan en paralelo: cada tarjeta resuelve de forma independiente.
    cargarTecnico(datos);
    cargarPagespeed(datos);
    cargarCro(datos);
    cargarVisibilidadIA(datos);
  }

  function reiniciar() {
    setDatosEnviados(null);
    setTecnico(null);
    setPagespeed(null);
    setCro(null);
    setVisibilidadIA(null);
  }

  const puntajesSecciones = [
    tecnico?.ok ? tecnico.score : null,
    pagespeed?.ok ? promedio([pagespeed.scorePerformance, pagespeed.scoreSeo, pagespeed.scoreAccesibilidad]) : null,
    cro?.ok ? promedio(cro.dimensiones.map((d) => d.score)) : null,
    visibilidadIA?.ok && visibilidadIA.totalPreguntas > 0
      ? Math.round((visibilidadIA.scoreVisibilidad / visibilidadIA.totalPreguntas) * 100)
      : null,
  ].filter((v): v is number => v !== null);

  const puntajeGeneral = puntajesSecciones.length > 0 ? promedio(puntajesSecciones) : null;

  return (
    <main className="min-h-screen bg-marca-blanco pb-24 print:min-h-0 print:pb-0">
      <header className="border-b border-zinc-200 bg-white px-6 py-8 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <Image
            src="/logo-polilla-digital.png"
            alt="Polilla Digital"
            width={651}
            height={100}
            className="h-7 w-auto sm:h-8"
            priority
          />
          <div className="mt-8 text-center sm:mt-10">
            <h1 className="bg-gradient-to-r from-marca-purpura via-marca-magenta to-marca-coral bg-clip-text font-display text-4xl font-extrabold tracking-tight text-transparent sm:text-6xl">
              ¿Te encuentran?
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 sm:text-xl">
              ¿Qué tan CRO es tu sitio? Revisemos si tu sitio está hecho para
              vender, si Google y las IAs lo encuentran y confían en tu marca.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {!datosEnviados && <Formulario onEnviar={manejarEnvio} cargando={false} />}

        {datosEnviados && (
          <div className="space-y-16">
            <div className="imprimir-bloque flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Informe para
                </p>
                <p className="text-xl font-bold text-zinc-900">
                  {datosEnviados.url} · {datosEnviados.rubro} · {datosEnviados.ciudad}
                </p>
              </div>
              {puntajeGeneral !== null && (
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-2xl font-extrabold ${CLASES_PUNTAJE_GENERAL[estadoPorPuntaje(puntajeGeneral)]}`}
                  >
                    {puntajeGeneral}
                  </span>
                  <span className="max-w-[10rem] text-sm font-semibold text-zinc-500">
                    Puntaje general del informe
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-3 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="rounded-xl border border-marca-magenta/30 px-4 py-2 text-base font-semibold text-marca-purpura hover:bg-marca-magenta/5"
                >
                  Descargar informe (PDF)
                </button>
                <button
                  onClick={reiniciar}
                  className="rounded-xl border border-marca-magenta/30 px-4 py-2 text-base font-semibold text-marca-purpura hover:bg-marca-magenta/5"
                >
                  Analizar otro sitio
                </button>
              </div>
            </div>

            <EspejoGoogle
              tecnico={tecnico}
              cargandoTecnico={cargandoTecnico}
              onReintentarTecnico={() => cargarTecnico(datosEnviados)}
              pagespeed={pagespeed}
              cargandoPagespeed={cargandoPagespeed}
              onReintentarPagespeed={() => cargarPagespeed(datosEnviados)}
              cro={cro}
              cargandoCro={cargandoCro}
              onReintentarCro={() => cargarCro(datosEnviados)}
            />

            <EspejoIA
              visibilidad={visibilidadIA}
              cargando={cargandoVisibilidadIA}
              onReintentar={() => cargarVisibilidadIA(datosEnviados)}
            />

            <div className="print:hidden">
              <PlanAccion tecnico={tecnico} pagespeed={pagespeed} cro={cro} visibilidadIA={visibilidadIA} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
