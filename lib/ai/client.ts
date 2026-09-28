import { GoogleGenAI } from "@google/genai";
export { MODELO_PERSONAJE, MODELO_TUTOR } from "./providers/config";

const apiKey = process.env.GEMINI_API_KEY;

export const isAiConfigured =
  process.env.AI_PROVIDER === "groq"
    ? Boolean(process.env.GROQ_API_KEY)
    : Boolean(apiKey);

export function getGeminiClient(): GoogleGenAI | null {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

/**
 * 502/503 = error temporal del proveedor ("high demand", ver incidente del 24 sep 2026 en el
 * README) — vale la pena reintentar, puede resolverse en menos de un segundo.
 * 429 (límite de RPM/RPD) NO se reintenta: nuestro backoff (bajo 2s) es mucho
 * más corto que la ventana de 60s de RPM, así que reintentar casi nunca ayuda
 * y solo gasta otra llamada contra una cuota que ya está justa (ver README,
 * sección de límites reales medidos en AI Studio: RPM 5 / RPD 20 por modelo).
 * Cualquier otro código (401, 400, etc.) tampoco se reintenta — no es transitorio.
 */
const CODIGOS_TRANSITORIOS = [502, 503];
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
 * Reintenta una llamada al proveedor de IA ante errores temporales 502/503,
 * con backoff exponencial corto. No
 * reintenta ningún otro tipo de error. Pensado para las 3 funciones de lib/ai/prompts/:
 * const respuesta = await llamarConReintento(() => client.models.generateContent({...}));
 */
export async function llamarConReintento<T>(
  llamada: () => Promise<T>,
): Promise<T> {
  let intento = 0;
  for (;;) {
    try {
      return await llamada();
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number(error.status)
          : undefined;
      const esTransitorio = CODIGOS_TRANSITORIOS.includes(status ?? -1);
      if (!esTransitorio || intento >= MAX_REINTENTOS) throw error;
      await esperar(calcularEspera(intento));
      intento++;
    }
  }
}

/**
 * Convierte cualquier error del proveedor de IA en un mensaje que un estudiante
 * de colegio puede leer — nunca el JSON crudo del error. El detalle técnico se
 * registra en el log del servidor (nunca llega al cliente) para que tú puedas
 * depurarlo sin exponerlo en la UI.
 */
export function mensajeErrorIA(error: unknown): string {
  console.error("[preparatorIA] Error al llamar al proveedor de IA:", error);
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : undefined;
  if (status === 502 || status === 503) {
    return "El servicio de IA está saturado en este momento. Espera unos segundos y vuelve a intentar.";
  }
  if (status === 429) {
    return "Se alcanzó el límite de uso gratuito de la IA por ahora. Espera un momento y vuelve a intentar.";
  }
  return "No se pudo contactar a la IA en este momento. Intenta de nuevo en unos segundos.";
}
