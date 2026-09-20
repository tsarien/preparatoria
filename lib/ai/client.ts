import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

export const isAiConfigured = Boolean(apiKey);

export function getAnthropicClient(): Anthropic | null {
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

/**
 * Modelo económico y rápido, para evaluaciones estructuradas simples (el tutor de
 * retos). Las simulaciones conversacionales más largas y matizadas de las Fases 4 y 5
 * (el estafador, el arrendador) deberían usar un modelo más capaz — ver PLAN_DESARROLLO.md,
 * sección 5 "Control de costos". Verifica el nombre exacto vigente en
 * console.anthropic.com antes de desplegar, esto cambia con el tiempo.
 */
export const MODELO_TUTOR = "claude-haiku-4-5-20251001";

/**
 * Modelo más capaz, para cuando la IA actúa como "personaje" dentro de una simulación
 * conversacional (el estafador de la Fase 4, el arrendador de la Fase 5). Estas
 * conversaciones necesitan más matiz — sonar creíble, reaccionar de forma natural —
 * que una evaluación estructurada de una sola respuesta.
 */
export const MODELO_PERSONAJE = "claude-sonnet-5";
