import { isAiConfigured, mensajeErrorIA } from "../client";
import { generateTutorResponse } from "../providers";
import { getAIKeyName } from "../providers/config";
import { validarRespuestaEstructurada } from "../providers/validation";
import { tutorFeedbackSchema, type TutorFeedback } from "../schemas/tutor";

const SYSTEM_PROMPT = `Eres el asistente pedagógico de preparatorIA para practicar la búsqueda del primer empleo con adolescentes colombianos.
Responde en español, con lenguaje respetuoso, claro y práctico. Basa tus observaciones únicamente en la respuesta y el escenario entregados; no inventes datos ni evalúes personalidad, apariencia, salud, origen, género u otras características sensibles.
Valora habilidades y aprendizajes demostrados, no la experiencia laboral formal. No des asesoría legal definitiva ni recomiendes compartir datos personales. No diagnostiques ni etiquetes al estudiante. Si hay varias decisiones razonables, reconoce sus ventajas y explica los tradeoffs en vez de imponer una respuesta correcta universal.
Devuelve únicamente la estructura solicitada. El feedback debe tener de 2 a 4 frases educativas y accionables.`;

export interface PrimerEmpleoFeedbackInput {
  retoNombre: string;
  contextoReto: string;
  decisionEstudiante: string;
}

export type ResultadoPrimerEmpleo =
  | { success: true; feedback: TutorFeedback }
  | { success: false; error: string };

export async function getPrimerEmpleoFeedback(
  input: PrimerEmpleoFeedbackInput,
): Promise<ResultadoPrimerEmpleo> {
  if (!isAiConfigured) {
    return {
      success: false,
      error: `Falta configurar ${getAIKeyName()} (ver README).`,
    };
  }

  try {
    const response = await generateTutorResponse({
      systemPrompt: SYSTEM_PROMPT,
      prompt: `Reto: ${input.retoNombre}\n\nEscenario: ${input.contextoReto}\n\nRespuesta del estudiante: ${input.decisionEstudiante}\n\nDa feedback educativo sin inferir información no proporcionada.`,
      schema: tutorFeedbackSchema,
    });

    if (response.blocked || !response.completed || !response.text) {
      return {
        success: false,
        error: "La IA no pudo generar retroalimentación para esta respuesta.",
      };
    }

    const feedback = validarRespuestaEstructurada<TutorFeedback>(
      response.text,
      tutorFeedbackSchema,
    );
    if (!feedback) {
      return {
        success: false,
        error: "La IA devolvió una respuesta que no se pudo interpretar.",
      };
    }

    return {
      success: true,
      feedback: {
        ...feedback,
        puntaje: Math.max(0, Math.min(100, Math.round(feedback.puntaje))),
      },
    };
  } catch (error) {
    return { success: false, error: mensajeErrorIA(error) };
  }
}
