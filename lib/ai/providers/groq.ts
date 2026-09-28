import OpenAI from "openai";
import { getAIModel, supportsGroqJsonSchema, type AITask } from "./config";
import type {
  AICompletionInput,
  AICompletionResult,
  AIProvider,
} from "./types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Falta configurar GROQ_API_KEY.");
  client ??= new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
  return client;
}

export function groqResponseFormat(
  schema: object,
  supportsJsonSchema: boolean,
) {
  if (!supportsJsonSchema) return { type: "json_object" as const };
  return {
    type: "json_schema" as const,
    json_schema: {
      name: "tutor_feedback",
      strict: true,
      schema: schema as Record<string, unknown>,
    },
  };
}

export const groqProvider: AIProvider = {
  async complete(
    task: AITask,
    input: AICompletionInput,
  ): Promise<AICompletionResult> {
    const model = getAIModel(task);
    const tutorSchema = task === "tutor" ? input.schema : undefined;
    const messages = [
      {
        role: "system" as const,
        content: tutorSchema
          ? `${input.systemPrompt}\n\nLa respuesta debe cumplir este JSON Schema:\n${JSON.stringify(tutorSchema)}`
          : input.systemPrompt,
      },
      ...input.historial.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];
    const response = await getClient().chat.completions.create({
      model,
      messages,
      max_tokens: tutorSchema
        ? Math.max(input.maxOutputTokens, 1400)
        : input.maxOutputTokens,
      ...(tutorSchema
        ? {
            response_format: groqResponseFormat(
              tutorSchema,
              supportsGroqJsonSchema(task),
            ),
          }
        : {}),
    });
    const choice = response.choices[0];
    return {
      text: choice?.message.content ?? null,
      blocked:
        Boolean(choice?.message.refusal) ||
        choice?.finish_reason === "content_filter",
      completed: choice?.finish_reason === "stop",
    };
  },
};
