import type { FromSchema } from "json-schema-to-ts";

export const educadorSchema = {
  type: "object",
  properties: {
    observacion: {
      type: "string",
      description: "Lectura breve sustentada en los datos entregados.",
    },
    fortalezas: { type: "array", items: { type: "string" } },
    aspectos_por_reforzar: { type: "array", items: { type: "string" } },
    recomendaciones: { type: "array", items: { type: "string" } },
    actividades_sugeridas: { type: "array", items: { type: "string" } },
  },
  required: [
    "observacion",
    "fortalezas",
    "aspectos_por_reforzar",
    "recomendaciones",
    "actividades_sugeridas",
  ],
  additionalProperties: false,
} as const;

export type InformeIAEducativa = FromSchema<typeof educadorSchema>;
