import { GoogleGenAI, ApiError } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const isAiConfigured = Boolean(apiKey);

export function getGeminiClient(): GoogleGenAI | null {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

/**
 * Códigos HTTP que consideramos transitorios (vale la pena reintentar):
 * 503 = modelo saturado ("high demand", ver incidente del 24 sep 2026 en el README),
 * 429 = límite de la capa gratuita alcanzado por un momento.
 * Cualquier otro código (401, 400, etc.) es un problema real — reintentarlo no ayuda.
 */
const CODIGOS_TRANSITORIOS = [429, 503];
const MAX_REINTENTOS = 2;
const ESPERA_BASE_MS = 700;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reintenta una llamada a la API de Gemini cuando falla por saturación temporal
 * del modelo (503) o límite de tasa (429), con backoff exponencial corto. No
 * reintenta ningún otro tipo de error. Pensado para las 3 funciones de lib/ai/prompts/:
 * const respuesta = await llamarConReintento(() => client.models.generateContent({...}));
 */
export async function llamarConReintento<T>(llamada: () => Promise<T>): Promise<T> {
  let intento = 0;
  for (;;) {
    try {
      return await llamada();
    } catch (error) {
      const esTransitorio = error instanceof ApiError && CODIGOS_TRANSITORIOS.includes(error.status);
      if (!esTransitorio || intento >= MAX_REINTENTOS) throw error;
      await esperar(ESPERA_BASE_MS * 2 ** intento);
      intento++;
    }
  }
}

/**
 * Convierte cualquier error de la API de Gemini en un mensaje que un estudiante
 * de colegio puede leer — nunca el JSON crudo del error. El detalle técnico se
 * registra en el log del servidor (nunca llega al cliente) para que tú puedas
 * depurarlo sin exponerlo en la UI.
 */
export function mensajeErrorIA(error: unknown): string {
  console.error("[preparatorIA] Error al llamar a la API de Gemini:", error);
  if (error instanceof ApiError) {
    if (error.status === 503) {
      return "El servicio de IA está saturado en este momento. Espera unos segundos y vuelve a intentar.";
    }
    if (error.status === 429) {
      return "Se alcanzó el límite de uso gratuito de la IA por ahora. Espera un momento y vuelve a intentar.";
    }
  }
  return "No se pudo contactar a la IA en este momento. Intenta de nuevo en unos segundos.";
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
