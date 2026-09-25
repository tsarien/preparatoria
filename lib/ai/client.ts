import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const isAiConfigured = Boolean(apiKey);

export function getGeminiClient(): GoogleGenAI | null {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

/**
 * Modelo económico y rápido, para evaluaciones estructuradas simples (el tutor de
 * retos). Las simulaciones conversacionales de las Fases 4 y 5 (el estafador, el
 * arrendador) usan MODELO_PERSONAJE — ver el comentario de esa constante.
 *
 * Usamos el alias flotante "gemini-flash-lite-latest" en vez de fijar una versión
 * con fecha (ej. "gemini-2.5-flash-lite"): Google reemplaza el modelo detrás del
 * alias varias veces al año (2.0 → 2.5 → 3.1 → 3.5 Flash-Lite en menos de 12 meses,
 * y los modelos viejos se apagan — Gemini 2.0 Flash dejó de funcionar el 1 jun 2026).
 * El alias evita que la app se rompa sola por una fecha en el código. Verifica el
 * catálogo vigente en https://ai.google.dev/gemini-api/docs/models#latest antes de
 * sustentar, esto cambia seguido.
 */
export const MODELO_TUTOR = "gemini-flash-lite-latest";

/**
 * Modelo más capaz, para cuando la IA actúa como "personaje" dentro de una
 * simulación conversacional (el estafador de la Fase 4, el arrendador de la Fase 5).
 *
 * OJO — decisión importante: el equivalente conceptual de Sonnet en el catálogo de
 * Gemini sería un modelo "Pro", pero desde abril de 2026 los modelos Pro salieron
 * de la capa gratuita de Google AI Studio (requieren facturación activa). Como el
 * objetivo de esta migración es que un profesor/jurado pueda probar la app gratis
 * y sin tarjeta, MODELO_PERSONAJE se queda dentro de la familia Flash (más capaz
 * que Flash-Lite, pero no Pro) en vez de replicar 1:1 el mapeo Haiku→Flash-Lite /
 * Sonnet→Pro que tenía la versión con Claude. Si más adelante activas facturación
 * y quieres subir la calidad de las simulaciones, cambia este valor a un modelo Pro.
 */
export const MODELO_PERSONAJE = "gemini-flash-latest";
