export interface Clausula {
  id: string;
  texto: string;
  preocupante: boolean;
}

export interface Pregunta {
  id: string;
  texto: string;
  opciones: string[];
  respuesta_correcta: number;
}

/** % de cláusulas correctamente clasificadas (marcadas si son preocupantes, no marcadas si no lo son). */
export function calcularPuntajeClausulas(seleccionadas: string[], clausulas: Clausula[]): number {
  if (clausulas.length === 0) return 0;
  const aciertos = clausulas.filter((c) => seleccionadas.includes(c.id) === c.preocupante).length;
  return Math.round((aciertos / clausulas.length) * 100);
}

/** % de preguntas de comprensión respondidas correctamente. `respuestas` mapea id de pregunta -> índice elegido. */
export function calcularPuntajePreguntas(respuestas: Record<string, number>, preguntas: Pregunta[]): number {
  if (preguntas.length === 0) return 0;
  const aciertos = preguntas.filter((p) => respuestas[p.id] === p.respuesta_correcta).length;
  return Math.round((aciertos / preguntas.length) * 100);
}

/** Puntaje final del reto: promedio simple entre detectar cláusulas y responder preguntas. */
export function calcularPuntajeContrato(puntajeClausulas: number, puntajePreguntas: number): number {
  return Math.round((puntajeClausulas + puntajePreguntas) / 2);
}
