import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const generateContentMock = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
}));

const ORIGINAL_ENV = process.env.GEMINI_API_KEY;
const ESCENARIO = {
  descripcionPersonaje: "Arrendador razonable de un apartamento en Medellín.",
  puntoNegociacion: "Reducir el depósito de dos meses a uno.",
  mensajeInicial: "Hola, ¿en qué te puedo ayudar con el apartamento?",
};

describe("simularArrendador (migración a Gemini)", () => {
  beforeEach(() => {
    vi.resetModules();
    generateContentMock.mockReset();
    process.env.GEMINI_API_KEY = "clave-de-prueba";
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = ORIGINAL_ENV;
  });

  it("convierte 'estudiante'→'user' y 'arrendador'→'model', y separa systemInstruction", async () => {
    generateContentMock.mockResolvedValue({
      candidates: [{ finishReason: "STOP" }],
      text: "Podríamos hablarlo si me das una referencia.",
    });

    const { simularArrendador } = await import("./arrendador");
    const resultado = await simularArrendador(ESCENARIO, [
      { autor: "arrendador", texto: ESCENARIO.mensajeInicial },
      { autor: "estudiante", texto: "¿Podríamos bajar el depósito a un mes?" },
    ]);

    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.mensaje).toContain("referencia");

    const llamada = generateContentMock.mock.calls[0][0];
    expect(llamada.contents).toEqual([
      { role: "model", parts: [{ text: ESCENARIO.mensajeInicial }] },
      { role: "user", parts: [{ text: "¿Podríamos bajar el depósito a un mes?" }] },
    ]);
    expect(llamada.config.systemInstruction).toContain(ESCENARIO.puntoNegociacion);
  });

  it("rechaza si el último mensaje no es del estudiante, sin llamar a la API", async () => {
    const { simularArrendador } = await import("./arrendador");
    const resultado = await simularArrendador(ESCENARIO, [
      { autor: "arrendador", texto: ESCENARIO.mensajeInicial },
    ]);

    expect(resultado.success).toBe(false);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("devuelve error si falta GEMINI_API_KEY", async () => {
    delete process.env.GEMINI_API_KEY;
    const { simularArrendador } = await import("./arrendador");
    const resultado = await simularArrendador(ESCENARIO, [
      { autor: "estudiante", texto: "hola" },
    ]);

    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error).toContain("GEMINI_API_KEY");
  });
});
