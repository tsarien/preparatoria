/**
 * Constantes y tipos compartidos entre las Server Actions y los Client
 * Components del módulo IA Guía.
 *
 * Este archivo NO lleva "use server" a propósito: Next.js solo permite
 * exportar funciones async desde un archivo con esa directiva, así que
 * cualquier const o tipo compartido tiene que vivir aquí.
 */
import type { MensajeGuia } from "@/lib/ai/prompts/guia";

/**
 * Tope diario de mensajes del estudiante. Deshabilitado por ahora — se
 * activará cuando se haga el análisis de costo de la capa de IA.
 *
 * ACTIVACIÓN: descomentar el bloque marcado en `actions.ts` dentro de
 * `enviarMensajeGuia`.
 */
export const MAX_MENSAJES_DIA = 30;

/** Máximo de caracteres por mensaje (se valida también en el servidor). */
export const MAX_CARACTERES_MENSAJE = 800;

/** Mensajes que se cargan por conversación al abrirla (los MÁS RECIENTES). */
export const MAX_MENSAJES_CARGADOS = 100;

export interface ConversacionResumen {
  id: string;
  titulo: string;
  actualizado_en: string;
}

export interface EstadoGuia {
  /** Conversación abierta; null = todavía no existe (se crea al enviar el primer mensaje). */
  conversacionId: string | null;
  mensajes: MensajeGuia[];
  conversaciones: ConversacionResumen[];
}

export interface EnviarMensajeResultado {
  success: boolean;
  respuesta?: string;
  error?: string;
  /** Conversación a la que quedó asociado el mensaje (se crea si no existía). */
  conversacionId?: string;
  titulo?: string;
}
