import { GoogleGenAI } from "@google/genai";
import { getAIModel, type AITask } from "./config";
import type {
  AICompletionInput,
  AICompletionResult,
  AIProvider,
} from "./types";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta configurar GEMINI_API_KEY.");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export const geminiProvider: AIProvider = {
  async complete(
    task: AITask,
    input: AICompletionInput,
  ): Promise<AICompletionResult> {
    const response = await getClient().models.generateContent({
      model: getAIModel(task),
      contents:
        task === "tutor"
          ? input.historial[0].content
          : input.historial.map((message) => ({
              role: message.role === "assistant" ? "model" : "user",
              parts: [{ text: message.content }],
            })),
      config: {
        systemInstruction: input.systemPrompt,
        maxOutputTokens: input.maxOutputTokens,
        ...(input.schema
          ? {
              responseMimeType: "application/json",
              responseJsonSchema: input.schema,
            }
          : {}),
      },
    });
    const finishReason = response.candidates?.[0]?.finishReason;
    return {
      text: response.text ?? null,
      blocked: Boolean(response.promptFeedback?.blockReason),
      completed: !finishReason || finishReason === "STOP",
    };
  },
};
