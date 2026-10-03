// Periodos académicos disponibles para los reportes del educador. Fuente ÚNICA: la UI (select)
// y el servidor (validación) leen esta constante. Se guarda el texto legible + año en
// informes_educativos.periodo (columna text de hasta 40 caracteres).

export const PERIODOS_ACADEMICOS = [
  { valor: "periodo_1", etiqueta: "Primer periodo" },
  { valor: "periodo_2", etiqueta: "Segundo periodo" },
  { valor: "periodo_3", etiqueta: "Tercer periodo" },
  { valor: "periodo_4", etiqueta: "Cuarto periodo" },
] as const;

export type PeriodoAcademico = (typeof PERIODOS_ACADEMICOS)[number]["valor"];

export function esPeriodoValido(valor: string): valor is PeriodoAcademico {
  return PERIODOS_ACADEMICOS.some((periodo) => periodo.valor === valor);
}

/** Año actual en Colombia (America/Bogota, sin horario de verano). */
export function anioColombia(ahora = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
    }).format(ahora),
  );
}

/** "Primer periodo 2026" a partir del valor del select; null si el valor no es válido. */
export function etiquetaPeriodo(valor: string, ahora = new Date()): string | null {
  const periodo = PERIODOS_ACADEMICOS.find((item) => item.valor === valor);
  return periodo ? `${periodo.etiqueta} ${anioColombia(ahora)}` : null;
}
