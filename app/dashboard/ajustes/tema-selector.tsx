"use client";

import { useEffect, useState } from "react";
import { TEMA_STORAGE_KEY, TEMA_POR_DEFECTO, resolverEsOscuro, esTemaValido, type Tema } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPCIONES: { valor: Tema; etiqueta: string; descripcion: string }[] = [
  { valor: "claro", etiqueta: "Claro", descripcion: "Siempre fondo claro" },
  { valor: "oscuro", etiqueta: "Oscuro", descripcion: "Siempre fondo oscuro" },
  { valor: "sistema", etiqueta: "Sistema", descripcion: "Igual que tu dispositivo" },
];

function aplicarTema(tema: Tema) {
  const prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", resolverEsOscuro(tema, prefiereOscuro));
}

export function TemaSelector() {
  // Empieza en null y se resuelve en useEffect: en el servidor no sabemos la
  // preferencia guardada, y queremos evitar un desajuste con lo que ya aplicó
  // el script del layout antes de la hidratación.
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    const guardado = localStorage.getItem(TEMA_STORAGE_KEY);
    setTema(guardado && esTemaValido(guardado) ? guardado : TEMA_POR_DEFECTO);
  }, []);

  function elegir(nuevo: Tema) {
    setTema(nuevo);
    localStorage.setItem(TEMA_STORAGE_KEY, nuevo);
    aplicarTema(nuevo);
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tema de la aplicación">
      {OPCIONES.map((opcion) => {
        const activo = tema === opcion.valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => elegir(opcion.valor)}
            className={cn(
              "press flex flex-col items-start gap-0.5 rounded-md border px-3 py-2.5 text-left transition-colors",
              activo ? "border-gold bg-gold-soft" : "border-line bg-paper-raised hover:border-ink/30"
            )}
          >
            <span className="text-sm font-medium text-ink">{opcion.etiqueta}</span>
            <span className="text-xs text-ink-soft">{opcion.descripcion}</span>
          </button>
        );
      })}
    </div>
  );
}
