"use client";

import { useState } from "react";
import Formulario from "@/components/Formulario";
import EspejoGoogle from "@/components/EspejoGoogle";
import EspejoIA from "@/components/EspejoIA";
import { generarInformeMock } from "@/lib/datos-mock";
import { AnalisisTecnico, DatosFormulario, InformeCompleto } from "@/lib/tipos";

export default function Home() {
  const [informe, setInforme] = useState<InformeCompleto | null>(null);
  const [tecnico, setTecnico] = useState<AnalisisTecnico | null>(null);
  const [cargandoTecnico, setCargandoTecnico] = useState(false);

  async function manejarEnvio(datos: DatosFormulario) {
    // Pagespeed, CRO y visibilidad IA todavía usan datos de ejemplo hasta
    // que se construyan sus endpoints en las próximas fases.
    setInforme(generarInformeMock(datos.url, datos.rubro, datos.ciudad));
    setTecnico(null);
    setCargandoTecnico(true);

    try {
      const res = await fetch("/api/analisis/tecnico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      setTecnico(await res.json());
    } catch {
      setTecnico({
        ok: false,
        error: "No pudimos conectar con el servidor. Intenta de nuevo.",
        hallazgos: [],
      });
    } finally {
      setCargandoTecnico(false);
    }
  }

  function reiniciar() {
    setInforme(null);
    setTecnico(null);
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
              pagespeed={informe.pagespeed}
              cro={informe.cro}
            />

            <EspejoIA visibilidad={informe.visibilidadIA} />
          </div>
        )}
      </div>
    </main>
  );
}
