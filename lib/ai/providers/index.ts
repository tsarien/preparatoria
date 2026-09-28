import { llamarConReintento } from "../client";
import { getAIProvider } from "./config";
import { geminiProvider } from "./gemini";
import { groqProvider } from "./groq";
import type { AICompletionResult, AIProvider } from "./types";

function getProvider(): AIProvider {
  return getAIProvider() === "groq" ? groqProvider : geminiProvider;
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
