import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "@google/genai";

const generateContentMock = vi.fn();
vi.mock("@google/genai", async (importOriginal) => {
  const real = await importOriginal<typeof import("@google/genai")>();
  return {
    ...real,
    GoogleGenAI: class {
      models = { generateContent: generateContentMock };
    },
  };
});

const ORIGINAL_ENV = process.env.GEMINI_API_KEY;
const ESCENARIO = {
  descripcionPersonaje: "Supuesto asesor de una 'inversión' con rendimientos irreales.",
  canal: "WhatsApp",
  mensajeInicial: "¡Hola! Vi tu perfil y quiero ofrecerte una inversión con 40% mensual.",
  senalesClave: ["Rendimiento irreal", "Urgencia artificial", "Pide datos bancarios"],
};

describe("simularEstafador (migración a Gemini)", () => {
  beforeEach(() => {
    vi.resetModules();
    generateContentMock.mockReset();
    process.env.GEMINI_API_KEY = "clave-de-prueba";
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = ORIGINAL_ENV;
  });

  it("convierte 'estudiante'→'user' y 'estafador'→'model'", async () => {
    generateContentMock.mockResolvedValue({
      candidates: [{ finishReason: "STOP" }],
      text: "Tranquilo, es 100% legal, solo necesito que confirmes tus datos.",
    });

    const { simularEstafador } = await import("./estafador");
    const resultado = await simularEstafador(ESCENARIO, [
      { autor: "estafador", texto: ESCENARIO.mensajeInicial },
      { autor: "estudiante", texto: "¿Esto es una estafa?" },
    ]);

    expect(resultado.success).toBe(true);

    const llamada = generateContentMock.mock.calls[0][0];
    expect(llamada.contents).toEqual([
      { role: "model", parts: [{ text: ESCENARIO.mensajeInicial }] },
      { role: "user", parts: [{ text: "¿Esto es una estafa?" }] },
    ]);
    expect(llamada.config.systemInstruction).toContain("Rendimiento irreal");
  });

  it("rechaza si el último mensaje no es del estudiante", async () => {
    const { simularEstafador } = await import("./estafador");
    const resultado = await simularEstafador(ESCENARIO, [
      { autor: "estafador", texto: ESCENARIO.mensajeInicial },
    ]);

    expect(resultado.success).toBe(false);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("reproduce el incidente del 24 sep 2026: un 503 aislado se reintenta y responde bien", async () => {
    generateContentMock
      .mockRejectedValueOnce(
        new ApiError({
          message: '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}',
          status: 503,
        })
      )
      .mockResolvedValueOnce({
        candidates: [{ finishReason: "STOP" }],
        text: "Tranquilo, es de confianza, solo confirma tus datos.",
      });

    const { simularEstafador } = await import("./estafador");
    const resultado = await simularEstafador(ESCENARIO, [
      { autor: "estafador", texto: ESCENARIO.mensajeInicial },
      { autor: "estudiante", texto: "¿Esto es una estafa?" },
    ]);

    expect(resultado.success).toBe(true);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("si el 503 persiste, el estudiante ve un mensaje amigable — nunca el JSON crudo", async () => {
    generateContentMock.mockRejectedValue(
      new ApiError({
        message: '{"error":{"code":503,"message":"high demand","status":"UNAVAILABLE"}}',
        status: 503,
      })
    );

    const { simularEstafador } = await import("./estafador");
    const resultado = await simularEstafador(ESCENARIO, [
      { autor: "estafador", texto: ESCENARIO.mensajeInicial },
      { autor: "estudiante", texto: "¿Esto es una estafa?" },
    ]);

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error).not.toContain("{");
      expect(resultado.error).not.toContain("UNAVAILABLE");
    }
  });
});
