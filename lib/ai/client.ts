import { GoogleGenAI, ApiError } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const isAiConfigured = Boolean(apiKey);

export function getGeminiClient(): GoogleGenAI | null {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

/**
 * 503 = modelo saturado ("high demand", ver incidente del 24 sep 2026 en el
 * README) — vale la pena reintentar, puede resolverse en menos de un segundo.
 * 429 (límite de RPM/RPD) NO se reintenta: nuestro backoff (bajo 2s) es mucho
 * más corto que la ventana de 60s de RPM, así que reintentar casi nunca ayuda
 * y solo gasta otra llamada contra una cuota que ya está justa (ver README,
 * sección de límites reales medidos en AI Studio: RPM 5 / RPD 20 por modelo).
 * Cualquier otro código (401, 400, etc.) tampoco se reintenta — no es transitorio.
 */
const CODIGOS_TRANSITORIOS = [503];
const MAX_REINTENTOS = 1;
const ESPERA_BASE_MS = 800;
const JITTER_MAX_MS = 400;

/**
 * Backoff exponencial + jitter (recomendado por Google para 503 — evita que
 * muchos clientes reintenten en el mismo instante exacto). Con MAX_REINTENTOS=1,
 * el peor caso de espera pura es ~800-1200ms, dejando margen de sobra dentro
 * de los 10s que corta una Server Action en Vercel Hobby. Se bajó de 2 a 1
 * reintento el 25 sep 2026 al confirmar en AI Studio que el proyecto ya anda
 * cerca del techo de RPM (4/5) — cada interacción del estudiante ahora cuesta
 * como máximo 2 llamadas a Gemini, no 3.
 */
function calcularEspera(intento: number): number {
  return ESPERA_BASE_MS * 2 ** intento + Math.random() * JITTER_MAX_MS;
}

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
      await esperar(calcularEspera(intento));
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
 *
 * Fijado explícitamente a "gemini-2.5-flash" el 25 sep 2026 (en vez del alias
 * "gemini-flash-latest", que en ese momento resolvía a Gemini 3.8 Flash) como
 * experimento tras varios 503 en producción: 3.8 Flash llevaba solo 3 semanas
 * de lanzado y hay reportes recientes de otros desarrolladores viendo el mismo
 * error con ese modelo específico. OJO: en AI Studio, gemini-2.5-flash tiene
 * EXACTAMENTE el mismo techo que 3.8 Flash en este proyecto (RPM 5 / RPD 20 /
 * TPM 250K — verificado en el dashboard) — este cambio es una apuesta a que un
 * modelo con más meses en producción tenga menos tropiezos de capacidad, NO una
 * forma de conseguir más cuota. Si sigues viendo 503 con este modelo, el
 * problema es la disponibilidad general de la capa gratuita de Gemini en ese
 * momento, no algo que un cambio de modelo vaya a arreglar.
 */
export const MODELO_PERSONAJE = "gemini-2.5-flash";
