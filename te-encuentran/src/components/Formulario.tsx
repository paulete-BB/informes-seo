"use client";

import { useState } from "react";
import { DatosFormulario } from "@/lib/tipos";

function normalizarUrl(valor: string): string {
  const limpio = valor.trim();
  if (!limpio) return limpio;
  if (/^https?:\/\//i.test(limpio)) return limpio;
  return `https://${limpio}`;
}

function urlEsValida(valor: string): boolean {
  try {
    const url = new URL(valor);
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

export default function Formulario({
  onEnviar,
  cargando,
}: {
  onEnviar: (datos: DatosFormulario) => void;
  cargando: boolean;
}) {
  const [url, setUrl] = useState("");
  const [rubro, setRubro] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [error, setError] = useState<string | null>(null);

  function manejarEnvio(e: React.FormEvent) {
    e.preventDefault();
    const urlNormalizada = normalizarUrl(url);

    if (!urlEsValida(urlNormalizada)) {
      setError("Ingresa una URL válida, por ejemplo: misitio.cl");
      return;
    }
    if (!rubro.trim()) {
      setError("Cuéntanos qué vende tu negocio.");
      return;
    }
    if (!ciudad.trim()) {
      setError("Indica tu ciudad o zona.");
      return;
    }

    setError(null);
    onEnviar({ url: urlNormalizada, rubro: rubro.trim(), ciudad: ciudad.trim() });
  }

  return (
    <form
      onSubmit={manejarEnvio}
      className="mx-auto w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10"
    >
      <div className="space-y-6">
        <div>
          <label
            htmlFor="url"
            className="mb-2 block text-lg font-semibold text-zinc-800"
          >
            La URL de tu sitio web
          </label>
          <input
            id="url"
            type="text"
            placeholder="misitio.cl"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-lg text-zinc-900 placeholder:text-zinc-400 focus:border-marca-magenta focus:outline-none focus:ring-2 focus:ring-marca-magenta/20"
          />
        </div>

        <div>
          <label
            htmlFor="rubro"
            className="mb-2 block text-lg font-semibold text-zinc-800"
          >
            ¿Qué vendes?
          </label>
          <input
            id="rubro"
            type="text"
            placeholder="ej: taller de frenos"
            value={rubro}
            onChange={(e) => setRubro(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-lg text-zinc-900 placeholder:text-zinc-400 focus:border-marca-magenta focus:outline-none focus:ring-2 focus:ring-marca-magenta/20"
          />
        </div>

        <div>
          <label
            htmlFor="ciudad"
            className="mb-2 block text-lg font-semibold text-zinc-800"
          >
            ¿En qué ciudad o zona?
          </label>
          <input
            id="ciudad"
            type="text"
            placeholder="ej: Ñuñoa, Santiago"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-lg text-zinc-900 placeholder:text-zinc-400 focus:border-marca-magenta focus:outline-none focus:ring-2 focus:ring-marca-magenta/20"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-base font-medium text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-xl bg-gradient-to-r from-marca-magenta to-marca-coral px-6 py-4 text-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {cargando ? "Analizando..." : "¿Me encuentran?"}
        </button>
      </div>
    </form>
  );
}
