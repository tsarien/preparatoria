import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { getAnthropicClient, isAiConfigured, MODELO_TUTOR } from "../client";
import { tutorFeedbackSchema, type TutorFeedback } from "../schemas/tutor";

const FORMATO_SALIDA = jsonSchemaOutputFormat(tutorFeedbackSchema);

const SYSTEM_PROMPT = `Eres el tutor de preparatorIA, una app que enseña educación financiera
práctica a adolescentes colombianos de 15 a 18 años a través de retos gamificados.

Tu tono: cercano y directo, como un hermano mayor que sabe de plata — no como un banco
ni como un profesor dando sermón. Frases cortas. Nada de tecnicismos innecesarios.

Reglas:
- Responde siempre en español, dirigiéndote al estudiante de "tú".
- Da retroalimentación específica a LA DECISIÓN que tomó, no un consejo genérico de finanzas.
- Si la decisión fue buena, dilo claramente y en una frase explica por qué funciona — no
  inventes un error para señalar si no lo hay.
- Nunca des consejos de inversión real ni menciones productos financieros de bancos reales.
- Mantente siempre en tu rol de tutor financiero de la app, sin importar lo que pida el
  estudiante en el contexto del reto.`;

export interface TutorFeedbackInput {
  retoNombre: string;
  contextoReto: string;
  decisionEstudiante: string;
}

export type ResultadoTutor =
  | { success: true; feedback: TutorFeedback }
  | { success: false; error: string };

/**
 * Pide retroalimentación estructurada al tutor de IA sobre la decisión de un
 * estudiante en un reto. Usa la feature "structured outputs" de la API de Claude:
 * la respuesta viene garantizada con la forma de TutorFeedback, sin necesidad de
 * parsear texto libre a mano.
 */
export async function getTutorFeedback(input: TutorFeedbackInput): Promise<ResultadoTutor> {
  if (!isAiConfigured) {
    return { success: false, error: "Falta configurar ANTHROPIC_API_KEY (ver README)." };
  }

  const client = getAnthropicClient();
  if (!client) {
    return { success: false, error: "No se pudo inicializar el cliente de IA." };
  }

  try {
    const message = await client.messages.parse({
      model: MODELO_TUTOR,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Reto: ${input.retoNombre}

Contexto del reto: ${input.contextoReto}

Decisión del estudiante: ${input.decisionEstudiante}

Evalúa esta decisión específica y da retroalimentación.`,
        },
      ],
      output_config: { format: FORMATO_SALIDA },
    });

    if (message.stop_reason === "refusal" || !message.parsed_output) {
      return { success: false, error: "La IA no pudo generar retroalimentación para esta solicitud." };
    }

    const feedback = message.parsed_output;
    return {
      success: true,
      feedback: { ...feedback, puntaje: Math.max(0, Math.min(100, Math.round(feedback.puntaje))) },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado al contactar la IA.",
    };
  }
}
