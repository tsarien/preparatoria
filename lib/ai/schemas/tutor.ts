import type { FromSchema } from "json-schema-to-ts";

/**
 * Salida estructurada del tutor. El subset de JSON Schema que soporta Gemini
 * (type, enum, properties, required, additionalProperties, etc.) cubre este schema
 * sin cambios — ver lib/ai/prompts/tutor.ts para cómo se conecta con la API.
 */
export const tutorFeedbackSchema = {
  type: "object",
  properties: {
    puntaje: {
      type: "integer",
      description: "Qué tan buena fue la decisión del estudiante, de 0 a 100.",
    },
    categoria_error: {
      type: "string",
      enum: [
        "ninguno",
        "gasto_hormiga",
        "no_prioriza_ahorro",
        "sobregasto",
        "desbalance_categorias",
        "no_detecta_senales_estafa",
        "confia_sin_verificar",
        "otro",
      ],
      description: "'ninguno' si la decisión fue buena — no siempre hay un error que señalar.",
    },
    feedback: {
      type: "string",
      description:
        "2 a 4 frases en español, dirigidas directamente al estudiante (tú), sobre ESTA decisión en particular.",
    },
    ajustar_dificultad: {
      type: "string",
      enum: ["subir", "mantener", "bajar"],
      description: "Con base en qué tan bien le fue, ¿el siguiente reto debería ser más difícil?",
    },
  },
  required: ["puntaje", "categoria_error", "feedback", "ajustar_dificultad"],
  additionalProperties: false,
} as const;

export type TutorFeedback = FromSchema<typeof tutorFeedbackSchema>;
