export type Tema = "claro" | "oscuro" | "sistema";

export const TEMA_STORAGE_KEY = "preparatoria-tema";
export const TEMA_POR_DEFECTO: Tema = "sistema";

/**
 * Traduce la preferencia guardada + la preferencia del sistema operativo a un
 * simple sí/no de si debe aplicarse el modo oscuro. Separada del código que
 * toca el DOM/localStorage para poder probarla con Vitest sin un navegador.
 */
export function resolverEsOscuro(tema: Tema, prefiereOscuroSistema: boolean): boolean {
  if (tema === "oscuro") return true;
  if (tema === "claro") return false;
  return prefiereOscuroSistema;
}

export function esTemaValido(valor: string): valor is Tema {
  return valor === "claro" || valor === "oscuro" || valor === "sistema";
}
