import type { InformeIAEducativa } from "./ai/schemas/educador";

/** Longitud de las preguntas del educador (se valida también en el servidor). */
export const PREGUNTA_MIN = 12;
export const PREGUNTA_MAX = 500;

/** Cuántos turnos previos de la conversación se envían a la IA como contexto. */
export const TURNOS_DE_CONTEXTO = 6;

const LISTAS: [keyof InformeIAEducativa, string][] = [
  ["fortalezas", "Fortalezas observadas"],
  ["aspectos_por_reforzar", "Aspectos por reforzar"],
  ["recomendaciones", "Recomendaciones"],
  ["actividades_sugeridas", "Estrategias de clase"],
];

/** Guarda legible en `texto` el informe estructurado (el JSON va aparte en `contexto`). */
export function informeATexto(informe: InformeIAEducativa): string {
  const partes = [`Observación: ${informe.observacion}`];
  for (const [clave, titulo] of LISTAS) {
    const items = informe[clave] as string[];
    if (items.length > 0)
      partes.push(`${titulo}:\n${items.map((i) => `- ${i}`).join("\n")}`);
  }
  return partes.join("\n\n").slice(0, 6000);
}

/** Valida (sin confiar en la BD) que un `contexto` guardado contenga un informe estructurado. */
export function extraerInforme(contexto: unknown): InformeIAEducativa | null {
  if (!contexto || typeof contexto !== "object") return null;
  const informe = (contexto as { informe?: unknown }).informe;
  if (!informe || typeof informe !== "object") return null;
  const dato = informe as Record<string, unknown>;
  const esLista = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === "string");
  if (
    typeof dato.observacion !== "string" ||
    !esLista(dato.fortalezas) ||
    !esLista(dato.aspectos_por_reforzar) ||
    !esLista(dato.recomendaciones) ||
    !esLista(dato.actividades_sugeridas)
  )
    return null;
  return {
    observacion: dato.observacion,
    fortalezas: dato.fortalezas,
    aspectos_por_reforzar: dato.aspectos_por_reforzar,
    recomendaciones: dato.recomendaciones,
    actividades_sugeridas: dato.actividades_sugeridas,
  };
}

export function validarPreguntaEducativa(pregunta: string): string | null {
  const limpia = pregunta.trim();
  if (limpia.length < PREGUNTA_MIN)
    return "Formula una pregunta pedagógica más concreta.";
  if (limpia.length > PREGUNTA_MAX)
    return `La pregunta no puede superar ${PREGUNTA_MAX} caracteres.`;
  return null;
}
