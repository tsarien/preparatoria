/**
 * Constantes y tipos compartidos entre las Server Actions y los Client
 * Components del módulo IA Guía.
 *
 * Este archivo NO lleva "use server" a propósito: Next.js solo permite
 * exportar funciones async desde un archivo con esa directiva, así que
 * cualquier const o tipo compartido tiene que vivir aquí.
 */

/**
 * Tope diario de mensajes del estudiante. Deshabilitado por ahora — se
 * activará cuando se haga el análisis de costo de la capa de IA.
 *
 * ACTIVACIÓN: descomentar el bloque marcado en `actions.ts` dentro de
 * `enviarMensajeGuia`.
 */
export const MAX_MENSAJES_DIA = 30;

export interface EnviarMensajeResultado {
  success: boolean;
  respuesta?: string;
  error?: string;
}
