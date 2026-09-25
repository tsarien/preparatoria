import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock del SDK de Gemini — controla exactamente lo que "responde" la API en cada caso.
const generateContentMock = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
}));

const ORIGINAL_ENV = process.env.GEMINI_API_KEY;

describe("getTutorFeedback (migración a Gemini)", () => {
  beforeEach(() => {
    vi.resetModules();
    generateContentMock.mockReset();
    process.env.GEMINI_API_KEY = "clave-de-prueba";
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = ORIGINAL_ENV;
  });

  it("devuelve error claro si falta GEMINI_API_KEY, sin llamar a la API", async () => {
    delete process.env.GEMINI_API_KEY;
    const { getTutorFeedback } = await import("./tutor");

    const resultado = await getTutorFeedback({
      retoNombre: "Distribuye tu primer salario",
      contextoReto: "...",
      decisionEstudiante: "...",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error).toContain("GEMINI_API_KEY");
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("parsea la retroalimentación estructurada y pide responseMimeType/responseJsonSchema", async () => {
    generateContentMock.mockResolvedValue({
      candidates: [{ finishReason: "STOP" }],
      promptFeedback: undefined,
      text: JSON.stringify({
        puntaje: 87,
        categoria_error: "ninguno",
        feedback: "Buena decisión.",
        ajustar_dificultad: "mantener",
      }),
    });

    const { getTutorFeedback } = await import("./tutor");
    const resultado = await getTutorFeedback({
      retoNombre: "Distribuye tu primer salario",
      contextoReto: "...",
      decisionEstudiante: "...",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.feedback.puntaje).toBe(87);
      expect(resultado.feedback.categoria_error).toBe("ninguno");
    }

    const llamada = generateContentMock.mock.calls[0][0];
    expect(llamada.config.responseMimeType).toBe("application/json");
    expect(llamada.config.responseJsonSchema).toBeDefined();
    expect(llamada.config.responseFormat).toBeUndefined(); // no existe en el SDK instalado
  });

  it("recorta el puntaje fuera de 0-100 igual que la versión con Claude", async () => {
    generateContentMock.mockResolvedValue({
      candidates: [{ finishReason: "STOP" }],
      text: JSON.stringify({
        puntaje: 145,
        categoria_error: "otro",
        feedback: "x",
        ajustar_dificultad: "bajar",
      }),
    });

    const { getTutorFeedback } = await import("./tutor");
    const resultado = await getTutorFeedback({
      retoNombre: "r",
      contextoReto: "c",
      decisionEstudiante: "d",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.feedback.puntaje).toBe(100);
  });

  it("devuelve error si el prompt fue bloqueado (promptFeedback.blockReason)", async () => {
    generateContentMock.mockResolvedValue({
      promptFeedback: { blockReason: "SAFETY" },
      candidates: undefined,
      text: undefined,
    });

    const { getTutorFeedback } = await import("./tutor");
    const resultado = await getTutorFeedback({ retoNombre: "r", contextoReto: "c", decisionEstudiante: "d" });

    expect(resultado.success).toBe(false);
  });

  it("devuelve error si finishReason no es STOP (equivalente a stop_reason==='refusal')", async () => {
    generateContentMock.mockResolvedValue({
      candidates: [{ finishReason: "SAFETY" }],
      text: undefined,
    });

    const { getTutorFeedback } = await import("./tutor");
    const resultado = await getTutorFeedback({ retoNombre: "r", contextoReto: "c", decisionEstudiante: "d" });

    expect(resultado.success).toBe(false);
  });
});
