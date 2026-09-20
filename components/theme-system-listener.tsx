"use client";

import { useEffect } from "react";
import { TEMA_STORAGE_KEY, esTemaValido } from "@/lib/theme";

export function ThemeSystemListener() {
  useEffect(() => {
    const medios = window.matchMedia("(prefers-color-scheme: dark)");

    function aplicar() {
      const guardado = localStorage.getItem(TEMA_STORAGE_KEY);
      const tema = guardado && esTemaValido(guardado) ? guardado : "sistema";
      if (tema !== "sistema") return; // el usuario eligió algo explícito, no lo pisamos
      document.documentElement.classList.toggle("dark", medios.matches);
    }

    medios.addEventListener("change", aplicar);
    return () => medios.removeEventListener("change", aplicar);
  }, []);

  return null;
}
