export type AIProviderName = "gemini" | "groq" | "deepseek";
export type AITask = "tutor" | "personaje";

const MODELOS_POR_PROVEEDOR = {
  gemini: { tutor: "gemini-flash-lite-latest", personaje: "gemini-3.8-flash" },
  groq: { tutor: "openai/gpt-oss-20b", personaje: "openai/gpt-oss-120b" },
  deepseek: { tutor: "deepseek-flash", personaje: "deepseek-flash" },
} as const;

export function getAIProvider(): AIProviderName {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  if (provider === "gemini" || provider === "groq" || provider === "deepseek") {
    return provider;
  }
  throw new Error("AI_PROVIDER debe ser 'gemini', 'groq' o 'deepseek'.");
}

export function isAIConfigured(): boolean {
  return Boolean(process.env[getAIKeyName()]);
}

export function getAIKeyName(): string {
  const keyNames: Record<AIProviderName, string> = {
    gemini: "GEMINI_API_KEY",
    groq: "GROQ_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
  };
  return keyNames[getAIProvider()];
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

const proveedorInicial =
  process.env.AI_PROVIDER === "groq"
    ? "groq"
    : process.env.AI_PROVIDER === "deepseek"
      ? "deepseek"
      : "gemini";
export const MODELO_TUTOR = MODELOS_POR_PROVEEDOR[proveedorInicial].tutor;
export const MODELO_PERSONAJE =
  MODELOS_POR_PROVEEDOR[proveedorInicial].personaje;
