import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const generateContentMock = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
}));

const ORIGINAL_ENV = process.env.GEMINI_API_KEY;
const CTX = { nombre: "Daniel", nivel: 3, saldoBilletera: 520_000 };

describe("simularGuia", () => {
  beforeEach(() => {
    vi.resetModules();
    generateContentMock.mockReset();
    process.env.GEMINI_API_KEY = "clave-de-prueba";
  });
  afterEach(() => {
    process.env.GEMINI_API_KEY = ORIGINAL_ENV;
  });

  it("convierte 'estudiante'→'user' y 'guia'→'model', y mete el contexto en systemInstruction", async () => {
    generateContentMock.mockResolvedValue({
      candidates: [{ finishReason: "STOP" }],
      text: "Porque es más de lo que te queda libre este mes.",
    });
    const { simularGuia } = await import("./guia");
    const resultado = await simularGuia(CTX, [
      { autor: "estudiante", texto: "¿Por qué este gasto es malo?" },
    ]);

    expect(resultado.success).toBe(true);
    const llamada = generateContentMock.mock.calls[0][0];
    expect(llamada.contents).toEqual([
      { role: "user", parts: [{ text: "¿Por qué este gasto es malo?" }] },
    ]);
    expect(llamada.config.systemInstruction).toContain("Daniel");
    expect(llamada.config.systemInstruction).toContain("520.000");
  });

  it("solo envía los últimos 12 mensajes al modelo (truncado de contexto)", async () => {
    generateContentMock.mockResolvedValue({
      candidates: [{ finishReason: "STOP" }],
      text: "ok",
    });
    const { simularGuia } = await import("./guia");
    const largo = Array.from({ length: 30 }, (_, i) => ({
      autor: (i % 2 === 0 ? "guia" : "estudiante") as "guia" | "estudiante",
      texto: `msg ${i}`,
    }));
    largo.push({ autor: "estudiante", texto: "último" });

    await simularGuia(CTX, largo);
    const llamada = generateContentMock.mock.calls[0][0];
    expect(llamada.contents.length).toBe(12);
    expect(llamada.contents[11].parts[0].text).toBe("último");
  });

  it("rechaza si falta GEMINI_API_KEY", async () => {
    delete process.env.GEMINI_API_KEY;
    const { simularGuia } = await import("./guia");
    const resultado = await simularGuia(CTX, [
      { autor: "estudiante", texto: "hola" },
    ]);
    expect(resultado.success).toBe(false);
  });
});
