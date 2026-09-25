import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const generateContentMock = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
}));

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
});
