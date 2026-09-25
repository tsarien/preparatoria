import { getGeminiClient, isAiConfigured, llamarConReintento, mensajeErrorIA, MODELO_TUTOR } from "../client";
import { tutorFeedbackSchema, type TutorFeedback } from "../schemas/tutor";

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
 * estudiante en un reto. Usa el soporte nativo de JSON Schema de la API de Gemini
 * (`responseMimeType: "application/json"` + `responseJsonSchema`): la respuesta
 * viene garantizada con la forma de TutorFeedback, sin necesidad de parsear texto
 * libre a mano.
 *
 * Nota de migración: la documentación pública de Gemini (ai.google.dev) muestra
 * ejemplos con `config.responseFormat.text.schema`, pero los tipos reales del SDK
 * instalado (@google/genai) en esta versión no exponen ese campo — exponen
 * `responseMimeType` + `responseJsonSchema` (o `responseSchema` para el subset
 * propio de Gemini). Usamos estos dos porque son los que de verdad compilan contra
 * el paquete instalado. Si actualizas la versión de @google/genai, vuelve a
 * verificar los tipos de GenerateContentConfig antes de asumir que responseFormat
 * ya está disponible.
 */
export async function getTutorFeedback(input: TutorFeedbackInput): Promise<ResultadoTutor> {
  if (!isAiConfigured) {
    return { success: false, error: "Falta configurar GEMINI_API_KEY (ver README)." };
  }

  const client = getGeminiClient();
  if (!client) {
    return { success: false, error: "No se pudo inicializar el cliente de IA." };
  }

  try {
    const response = await llamarConReintento(() =>
      client.models.generateContent({
        model: MODELO_TUTOR,
        contents: `Reto: ${input.retoNombre}

Contexto del reto: ${input.contextoReto}

Decisión del estudiante: ${input.decisionEstudiante}

Evalúa esta decisión específica y da retroalimentación.`,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          maxOutputTokens: 500,
          responseMimeType: "application/json",
          responseJsonSchema: tutorFeedbackSchema,
        },
      })
    );

    if (response.promptFeedback?.blockReason) {
      return { success: false, error: "La IA no pudo generar retroalimentación para esta solicitud." };
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== "STOP") {
      return { success: false, error: "La IA no pudo generar retroalimentación para esta solicitud." };
    }

    const texto = response.text;
    if (!texto) {
      return { success: false, error: "La IA no devolvió retroalimentación para esta solicitud." };
    }

    let feedback: TutorFeedback;
    try {
      feedback = JSON.parse(texto) as TutorFeedback;
    } catch {
      return { success: false, error: "La IA devolvió una respuesta que no se pudo interpretar." };
    }

    return {
      success: true,
      feedback: { ...feedback, puntaje: Math.max(0, Math.min(100, Math.round(feedback.puntaje))) },
    };
  } catch (error) {
    return { success: false, error: mensajeErrorIA(error) };
  }
}
