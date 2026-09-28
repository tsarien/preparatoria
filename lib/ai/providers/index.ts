import { llamarConReintento } from "../client";
import { getAIProvider } from "./config";
import { geminiProvider } from "./gemini";
import { groqProvider } from "./groq";
import { deepseekProvider } from "./deepseek";
import type { AICompletionResult, AIProvider } from "./types";

function getProvider(): AIProvider {
  const provider = getAIProvider();
  if (provider === "groq") return groqProvider;
  if (provider === "deepseek") return deepseekProvider;
  return geminiProvider;
}

export function generateTutorResponse(input: {
  systemPrompt: string;
  prompt: string;
  schema: object;
}): Promise<AICompletionResult> {
  return llamarConReintento(() =>
    getProvider().complete("tutor", {
      systemPrompt: input.systemPrompt,
      historial: [{ role: "user", content: input.prompt }],
      maxOutputTokens: 500,
      schema: input.schema,
    }),
  );
}

export function generateCharacterResponse(input: {
  systemPrompt: string;
  historial: { role: "user" | "assistant"; content: string }[];
  maxOutputTokens: number;
}): Promise<AICompletionResult> {
  return llamarConReintento(() => getProvider().complete("personaje", input));
}
