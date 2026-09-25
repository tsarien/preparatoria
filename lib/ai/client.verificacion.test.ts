import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@google/genai";
import { llamarConReintento, mensajeErrorIA } from "./client";

describe("llamarConReintento", () => {
  it("reintenta un 503 (modelo saturado) y devuelve el resultado si el 2º intento funciona", async () => {
    const llamada = vi
      .fn()
      .mockRejectedValueOnce(new ApiError({ message: "high demand", status: 503 }))
      .mockResolvedValueOnce("ok");

    const resultado = await llamarConReintento(llamada);

    expect(resultado).toBe("ok");
    expect(llamada).toHaveBeenCalledTimes(2);
  });

  it("reintenta un 429 (límite de tasa) igual que un 503", async () => {
    const llamada = vi
      .fn()
      .mockRejectedValueOnce(new ApiError({ message: "rate limited", status: 429 }))
      .mockResolvedValueOnce("ok");

    const resultado = await llamarConReintento(llamada);
    expect(resultado).toBe("ok");
  });

  it("NO reintenta errores que no son transitorios (ej. 401 API key inválida)", async () => {
    const llamada = vi.fn().mockRejectedValue(new ApiError({ message: "invalid api key", status: 401 }));

    await expect(llamarConReintento(llamada)).rejects.toThrow();
    expect(llamada).toHaveBeenCalledTimes(1);
  });

  it("se rinde después de MAX_REINTENTOS y deja que el error se propague", async () => {
    const llamada = vi.fn().mockRejectedValue(new ApiError({ message: "high demand", status: 503 }));

    await expect(llamarConReintento(llamada)).rejects.toThrow();
    expect(llamada.mock.calls.length).toBeGreaterThanOrEqual(3); // intento inicial + reintentos
  });
});

describe("mensajeErrorIA", () => {
  it("nunca devuelve el JSON crudo del error — este es exactamente el bug del 24 sep 2026", () => {
    const errorCrudo = new ApiError({
      message: '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}',
      status: 503,
    });

    const mensaje = mensajeErrorIA(errorCrudo);

    expect(mensaje).not.toContain("{");
    expect(mensaje).not.toContain("UNAVAILABLE");
    expect(mensaje.toLowerCase()).toContain("satura");
  });

  it("da un mensaje distinto para 429 (límite de uso)", () => {
    const mensaje = mensajeErrorIA(new ApiError({ message: "x", status: 429 }));
    expect(mensaje.toLowerCase()).toContain("límite");
  });

  it("da un mensaje genérico para cualquier otro error, sin leer su .message", () => {
    const mensaje = mensajeErrorIA(new Error("detalle técnico que no debe llegar al estudiante"));
    expect(mensaje).not.toContain("detalle técnico");
  });
});
