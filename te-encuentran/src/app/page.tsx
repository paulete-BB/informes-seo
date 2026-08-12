"use client";

import { useState } from "react";
import Formulario from "@/components/Formulario";
import EspejoGoogle from "@/components/EspejoGoogle";
import EspejoIA from "@/components/EspejoIA";
import { generarInformeMock } from "@/lib/datos-mock";
import {
  AnalisisCRO,
  AnalisisPageSpeed,
  AnalisisTecnico,
  DatosFormulario,
  InformeCompleto,
} from "@/lib/tipos";

const ERROR_CONEXION = "No pudimos conectar con el servidor. Intenta de nuevo.";

export default function Home() {
  const [informe, setInforme] = useState<InformeCompleto | null>(null);
  const [tecnico, setTecnico] = useState<AnalisisTecnico | null>(null);
  const [cargandoTecnico, setCargandoTecnico] = useState(false);
  const [pagespeed, setPagespeed] = useState<AnalisisPageSpeed | null>(null);
  const [cargandoPagespeed, setCargandoPagespeed] = useState(false);
  const [cro, setCro] = useState<AnalisisCRO | null>(null);
  const [cargandoCro, setCargandoCro] = useState(false);

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
      setTecnico({ ok: false, error: ERROR_CONEXION, hallazgos: [] });
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

  function manejarEnvio(datos: DatosFormulario) {
    // Visibilidad IA todavía usa datos de ejemplo hasta que se construya su
    // endpoint en la próxima fase.
    setInforme(generarInformeMock(datos.url, datos.rubro, datos.ciudad));
    setTecnico(null);
    setPagespeed(null);
    setCro(null);
    // Se disparan en paralelo: cada tarjeta resuelve de forma independiente.
    cargarTecnico(datos);
    cargarPagespeed(datos);
    cargarCro(datos);
  }

  function reiniciar() {
    setInforme(null);
    setTecnico(null);
    setPagespeed(null);
    setCro(null);
  }

  return (
    <main className="min-h-screen bg-zinc-50 pb-24">
      <header className="border-b border-zinc-200 bg-white px-6 py-10 text-center sm:py-14">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl">
          ¿Te encuentran?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 sm:text-xl">
          Descubre cómo te ve Google y cómo te ve la Inteligencia Artificial
          cuando alguien busca lo que vendes.
        </p>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {!informe && <Formulario onEnviar={manejarEnvio} cargando={false} />}

        {informe && (
          <div className="space-y-16">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Informe para
                </p>
                <p className="text-xl font-bold text-zinc-900">
                  {informe.url} · {informe.rubro} · {informe.ciudad}
                </p>
              </div>
              <button
                onClick={reiniciar}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-base font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Analizar otro sitio
              </button>
            </div>

            <EspejoGoogle
              tecnico={tecnico}
              cargandoTecnico={cargandoTecnico}
              pagespeed={pagespeed}
              cargandoPagespeed={cargandoPagespeed}
              cro={cro}
              cargandoCro={cargandoCro}
            />

            <EspejoIA visibilidad={informe.visibilidadIA} />
          </div>
        )}
      </div>
    </main>
  );
}
