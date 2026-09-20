/**
 * Reglas de nivel/XP de "Mi Vida Simulada".
 *
 * Estas mismas reglas están espejadas en la función SQL `otorgar_xp`
 * (supabase/migrations/0003_wallet_functions.sql), que es la que de verdad
 * manda: la base de datos nunca confía en que el cliente calculó bien.
 * Esta versión en TypeScript existe para que el cliente pueda mostrar
 * progreso de forma consistente y para poder probar la fórmula con Vitest
 * sin necesitar una base de datos.
 */

export const XP_POR_NIVEL = 500;

/** Nivel correspondiente a un total de XP acumulado. */
export function calcularNivel(xpTotal: number): number {
  if (!Number.isFinite(xpTotal) || xpTotal < 0) {
    throw new Error("xpTotal debe ser un número mayor o igual a cero");
  }
  return Math.floor(xpTotal / XP_POR_NIVEL) + 1;
}

/** Cuánto XP lleva el personaje dentro de su nivel actual (para la barra de progreso). */
export function xpEnNivelActual(xpTotal: number): number {
  if (!Number.isFinite(xpTotal) || xpTotal < 0) {
    throw new Error("xpTotal debe ser un número mayor o igual a cero");
  }
  return xpTotal % XP_POR_NIVEL;
}

/** ¿Esta ganancia de XP hizo subir de nivel al personaje? Útil para disparar una animación/toast. */
export function subioDeNivel(xpAntes: number, xpDespues: number): boolean {
  return calcularNivel(xpDespues) > calcularNivel(xpAntes);
}
