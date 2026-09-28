export type AIProviderName = "gemini" | "groq";
export type AITask = "tutor" | "personaje";

const MODELOS_POR_PROVEEDOR = {
  gemini: { tutor: "gemini-flash-lite-latest", personaje: "gemini-2.5-flash" },
  groq: { tutor: "openai/gpt-oss-20b", personaje: "openai/gpt-oss-120b" },
} as const;

export function getAIProvider(): AIProviderName {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  if (provider === "gemini" || provider === "groq") return provider;
  throw new Error("AI_PROVIDER debe ser 'gemini' o 'groq'.");
}

export function isAIConfigured(): boolean {
  return getAIProvider() === "groq"
    ? Boolean(process.env.GROQ_API_KEY)
    : Boolean(process.env.GEMINI_API_KEY);
}

export function getAIKeyName(): string {
  return getAIProvider() === "groq" ? "GROQ_API_KEY" : "GEMINI_API_KEY";
}

export function getAIModel(task: AITask): string {
  return MODELOS_POR_PROVEEDOR[getAIProvider()][task];
}

export function supportsGroqJsonSchema(task: AITask): boolean {
  return (
    task === "tutor" &&
    ["openai/gpt-oss-20b", "openai/gpt-oss-120b"].includes(getAIModel(task))
  );
}

const proveedorInicial = process.env.AI_PROVIDER === "groq" ? "groq" : "gemini";
export const MODELO_TUTOR = MODELOS_POR_PROVEEDOR[proveedorInicial].tutor;
export const MODELO_PERSONAJE =
  MODELOS_POR_PROVEEDOR[proveedorInicial].personaje;
