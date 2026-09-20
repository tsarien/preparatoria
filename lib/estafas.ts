/** ¿Lo que dijo el estudiante (es/no es estafa) coincide con la realidad del escenario? */
export function identificacionCorrecta(estudianteDiceEstafa: boolean, esEstafaReal: boolean): boolean {
  return estudianteDiceEstafa === esEstafaReal;
}

/**
 * Cuánto dinero simulado se "ahorra" el personaje por evitar una estafa real.
 * Acertar que un mensaje LEGÍTIMO no es estafa está bien, pero no genera recompensa
 * monetaria — no había plata en riesgo que evitar perder.
 */
export function calcularRecompensaEstafaEvitada(
  estudianteDiceEstafa: boolean,
  esEstafaReal: boolean,
  montoEnRiesgo: number | null
): number {
  if (!identificacionCorrecta(estudianteDiceEstafa, esEstafaReal)) return 0;
  if (!esEstafaReal) return 0;
  return montoEnRiesgo ?? 0;
}

/** Límite de mensajes que el estudiante puede enviar dentro de un escenario interactivo. */
export const MAX_MENSAJES_ESTUDIANTE = 3;

export function puedeEnviarMensaje(mensajesEnviados: number, maxMensajes = MAX_MENSAJES_ESTUDIANTE): boolean {
  return mensajesEnviados < maxMensajes;
}
