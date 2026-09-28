import OpenAI from "openai";
import { getAIModel, type AITask } from "./config";
import type {
  AICompletionInput,
  AICompletionResult,
  AIProvider,
} from "./types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Falta configurar DEEPSEEK_API_KEY.");
  client ??= new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
  return client;
}

export const deepseekProvider: AIProvider = {
  async complete(
    task: AITask,
    input: AICompletionInput,
  ): Promise<AICompletionResult> {
    const tutorSchema = task === "tutor" ? input.schema : undefined;
    const systemPrompt = tutorSchema
      ? `${input.systemPrompt}\n\nDevuelve únicamente un objeto JSON válido que cumpla este schema:\n${JSON.stringify(tutorSchema)}`
      : input.systemPrompt;
    const response = await getClient().chat.completions.create({
      model: getAIModel(task),
      messages: [
        { role: "system", content: systemPrompt },
        ...input.historial.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      max_tokens: tutorSchema
        ? Math.max(input.maxOutputTokens, 1400)
        : input.maxOutputTokens,
      ...(tutorSchema
        ? { response_format: { type: "json_object" as const } }
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
