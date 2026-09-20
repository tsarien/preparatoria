"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { TEMA_STORAGE_KEY, type Tema } from "@/lib/theme";

export function ThemeToggleButton() {
  const [esOscuro, setEsOscuro] = useState<boolean | null>(null);

  useEffect(() => {
    // El script de app/layout.tsx ya aplicó la clase antes de esta hidratación
    // (ver lib/theme.ts) — solo la leemos, no la volvemos a calcular.
    setEsOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const nuevoTema: Tema = esOscuro ? "claro" : "oscuro";
    localStorage.setItem(TEMA_STORAGE_KEY, nuevoTema);
    document.documentElement.classList.toggle("dark", nuevoTema === "oscuro");
    setEsOscuro(nuevoTema === "oscuro");
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={esOscuro === null}
      aria-label={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper-raised/80 text-gold shadow-sm backdrop-blur-md transition-transform hover:scale-105 disabled:opacity-0"
    >
      {esOscuro === null ? null : esOscuro ? (
        <Sun className="h-5 w-5" strokeWidth={2.25} />
      ) : (
        <Moon className="h-5 w-5" strokeWidth={2.25} />
      )}
    </button>
  );
}
