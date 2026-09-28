import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tutorFeedbackSchema } from "../schemas/tutor";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  clientOptions: [] as unknown[],
}));

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: mocks.create } };

    constructor(options: unknown) {
      mocks.clientOptions.push(options);
    }
  },
}));

const originalProvider = process.env.AI_PROVIDER;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalGroqKey = process.env.GROQ_API_KEY;
const originalDeepseekKey = process.env.DEEPSEEK_API_KEY;

describe("proveedores de IA", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.create.mockReset();
    mocks.clientOptions.length = 0;
    process.env.AI_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "clave-de-prueba";
  });

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalGroqKey;
    if (originalDeepseekKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = originalDeepseekKey;
  });

  it("mantiene Gemini como valor por defecto y separa modelos por tarea", async () => {
    delete process.env.AI_PROVIDER;
    const config = await import("./config");
    expect(config.getAIProvider()).toBe("gemini");
    expect(config.getAIModel("tutor")).toBe("gemini-flash-lite-latest");

    process.env.AI_PROVIDER = "groq";
    expect(config.getAIModel("tutor")).toBe("openai/gpt-oss-20b");
    expect(config.getAIModel("personaje")).toBe("openai/gpt-oss-120b");
    expect(config.supportsGroqJsonSchema("tutor")).toBe(true);

    process.env.AI_PROVIDER = "deepseek";
    expect(config.getAIModel("tutor")).toBe("deepseek-flash");
    expect(config.getAIModel("personaje")).toBe("deepseek-flash");
    expect(config.getAIKeyName()).toBe("DEEPSEEK_API_KEY");
    expect(config.supportsGroqJsonSchema("tutor")).toBe(false);
  });

  it("usa el SDK OpenAI con endpoint Groq y salida JSON Schema estricta para el tutor", async () => {
    mocks.create.mockResolvedValue({
      choices: [
        { message: { content: "{}", refusal: null }, finish_reason: "stop" },
      ],
    });
    const { groqProvider } = await import("./groq");

    await groqProvider.complete("tutor", {
      systemPrompt: "Eres tutor.",
      historial: [{ role: "user", content: "Evalúa esta decisión." }],
      maxOutputTokens: 500,
      schema: tutorFeedbackSchema,
    });

    expect(mocks.clientOptions).toEqual([
      {
        apiKey: "clave-de-prueba",
        baseURL: "https://api.groq.com/openai/v1",
      },
    ]);
    const request = mocks.create.mock.calls[0][0];
    expect(request.model).toBe("openai/gpt-oss-20b");
    expect(request.max_tokens).toBe(1400);
    expect(request.response_format.type).toBe("json_schema");
    expect(request.response_format.json_schema.strict).toBe(true);
    expect(request.response_format.json_schema.schema).toEqual(
      tutorFeedbackSchema,
    );
  });

  it("usa deepseek-flash, el endpoint oficial y JSON mode con el schema en el prompt", async () => {
    process.env.AI_PROVIDER = "deepseek";
    process.env.DEEPSEEK_API_KEY = "clave-deepseek-de-prueba";
    mocks.create.mockResolvedValue({
      choices: [
        { message: { content: "{}", refusal: null }, finish_reason: "stop" },
      ],
    });
    const { generateTutorResponse } = await import("./index");

    await generateTutorResponse({
      systemPrompt: "Eres tutor.",
      prompt: "Evalúa esta decisión.",
      schema: tutorFeedbackSchema,
    });

    expect(mocks.clientOptions).toEqual([
      {
        apiKey: "clave-deepseek-de-prueba",
        baseURL: "https://api.deepseek.com",
      },
    ]);
    const request = mocks.create.mock.calls[0][0];
    expect(request.model).toBe("deepseek-flash");
    expect(request.max_tokens).toBe(1400);
    expect(request.response_format).toEqual({ type: "json_object" });
    expect(request.messages[0].content).toContain(
      JSON.stringify(tutorFeedbackSchema),
    );
  });

  it("selecciona un modelo distinto para personajes y ofrece el fallback json_object", async () => {
    mocks.create.mockResolvedValue({
      choices: [
        {
          message: { content: "Respuesta en personaje.", refusal: null },
          finish_reason: "stop",
        },
      ],
    });
    const { groqProvider, groqResponseFormat } = await import("./groq");
    const schema = { type: "object" };

    await groqProvider.complete("personaje", {
      systemPrompt: "Habla en personaje.",
      historial: [{ role: "user", content: "Hola." }],
      maxOutputTokens: 200,
    });

    expect(mocks.create.mock.calls[0][0].model).toBe("openai/gpt-oss-120b");
    expect(mocks.create.mock.calls[0][0].response_format).toBeUndefined();
    expect(groqResponseFormat(schema, false)).toEqual({ type: "json_object" });
  });

  it("rechaza JSON sintácticamente válido que no cumple el schema en runtime", async () => {
    const { validarRespuestaEstructurada } = await import("./validation");

    expect(
      validarRespuestaEstructurada('{"puntaje": 90}', tutorFeedbackSchema),
    ).toBeNull();
    expect(
      validarRespuestaEstructurada("no es JSON", tutorFeedbackSchema),
    ).toBeNull();
    expect(
      validarRespuestaEstructurada(
        JSON.stringify({
          puntaje: 90,
          categoria_error: "ninguno",
          feedback: "Buena decisión.",
          ajustar_dificultad: "mantener",
        }),
        tutorFeedbackSchema,
      ),
    ).toMatchObject({ puntaje: 90, categoria_error: "ninguno" });
  });

  it("indica GROQ_API_KEY cuando falta la credencial del proveedor seleccionado", async () => {
    delete process.env.GROQ_API_KEY;
    const { getTutorFeedback } = await import("../prompts/tutor");

    const resultado = await getTutorFeedback({
      retoNombre: "Reto",
      contextoReto: "Contexto",
      decisionEstudiante: "Decisión",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error).toContain("GROQ_API_KEY");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("indica DEEPSEEK_API_KEY cuando falta la credencial del proveedor seleccionado", async () => {
    process.env.AI_PROVIDER = "deepseek";
    delete process.env.DEEPSEEK_API_KEY;
    const { getTutorFeedback } = await import("../prompts/tutor");

    const resultado = await getTutorFeedback({
      retoNombre: "Reto",
      contextoReto: "Contexto",
      decisionEstudiante: "Decisión",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success)
      expect(resultado.error).toContain("DEEPSEEK_API_KEY");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
