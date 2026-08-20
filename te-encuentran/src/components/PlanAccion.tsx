"use client";

import { useState } from "react";
import {
  AnalisisCRO,
  AnalisisPageSpeed,
  AnalisisTecnico,
  AnalisisVisibilidadIA,
  PlanAccionCRO,
} from "@/lib/tipos";
import Semaforo from "./Semaforo";

function formatoTexto(plan: PlanAccionCRO): string {
  return plan.tareas
    .map(
      (t, i) =>
        `${i + 1}. ${t.tarea}\n   Por qué importa: ${t.porQueImporta}\n   Esfuerzo: ${t.esfuerzo} · Urgencia: ${t.urgencia}`
    )
    .join("\n\n");
}

export default function PlanAccion({
  tecnico,
  pagespeed,
  cro,
  visibilidadIA,
}: {
  tecnico: AnalisisTecnico | null;
  pagespeed: AnalisisPageSpeed | null;
  cro: AnalisisCRO | null;
  visibilidadIA: AnalisisVisibilidadIA | null;
}) {
  const [expandido, setExpandido] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [plan, setPlan] = useState<PlanAccionCRO | null>(null);
  const [copiado, setCopiado] = useState(false);

  const hayDatos = Boolean(tecnico?.ok || pagespeed?.ok || cro?.ok || visibilidadIA?.ok);

  async function generarPlan() {
    setCargando(true);
    try {
      const res = await fetch("/api/analisis/plan-accion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tecnico, pagespeed, cro, visibilidadIA }),
      });
      setPlan(await res.json());
    } catch {
      setPlan({ ok: false, error: "No pudimos conectar con el servidor.", tareas: [] });
    } finally {
      setCargando(false);
    }
  }

  function alternar() {
    const abriendo = !expandido;
    setExpandido(abriendo);
    if (abriendo && !plan && !cargando && hayDatos) {
      generarPlan();
    }
  }

  function copiar() {
    if (!plan?.ok) return;
    navigator.clipboard.writeText(formatoTexto(plan)).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function descargar() {
    if (!plan?.ok) return;
    const blob = new Blob([formatoTexto(plan)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plan-de-accion-cro.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
      <button onClick={alternar} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="text-lg font-semibold text-zinc-900">Plan de acción CRO</span>
          <span className="ml-2 text-sm text-zinc-400">(uso interno)</span>
        </span>
        <span className="text-zinc-400">{expandido ? "▲" : "▼"}</span>
      </button>

      {expandido && (
        <div className="mt-5">
          {!hayDatos && (
            <p className="text-base text-zinc-500">
              Espera a que termine al menos uno de los análisis de arriba para generar el plan.
            </p>
          )}
          {hayDatos && cargando && (
            <div className="flex items-center gap-3 text-zinc-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-marca-magenta" />
              <span className="text-base">Generando plan de acción...</span>
            </div>
          )}
          {hayDatos && !cargando && plan?.ok === false && (
            <p className="text-base text-zinc-600">{plan.error}</p>
          )}
          {plan?.ok && (
            <>
              <div className="mb-5 flex flex-wrap gap-3">
                <button
                  onClick={copiar}
                  className="rounded-lg border border-marca-magenta/30 px-4 py-2 text-sm font-semibold text-marca-purpura hover:bg-marca-magenta/5"
                >
                  {copiado ? "Copiado ✓" : "Copiar"}
                </button>
                <button
                  onClick={descargar}
                  className="rounded-lg border border-marca-magenta/30 px-4 py-2 text-sm font-semibold text-marca-purpura hover:bg-marca-magenta/5"
                >
                  Descargar
                </button>
              </div>
              <ol className="space-y-4">
                {plan.tareas.map((t, i) => (
                  <li key={i} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-base font-semibold text-zinc-800">
                        {i + 1}. {t.tarea}
                      </span>
                      <Semaforo estado={t.urgencia} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">{t.porQueImporta}</p>
                    <p className="mt-1 text-xs text-zinc-500">Esfuerzo: {t.esfuerzo}</p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}
