import type { AITask } from "./config";

export interface AICompletionInput {
  systemPrompt: string;
  historial: { role: "user" | "assistant"; content: string }[];
  maxOutputTokens: number;
  schema?: object;
}

export interface AICompletionResult {
  text: string | null;
  blocked: boolean;
  completed: boolean;
}

export interface AIProvider {
  complete(task: AITask, input: AICompletionInput): Promise<AICompletionResult>;
}
