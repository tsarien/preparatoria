import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@google/genai";
import { llamarConReintento, mensajeErrorIA } from "./client";

describe("llamarConReintento", () => {
  it("reintenta un 503 (modelo saturado) y devuelve el resultado si el 2º intento funciona", async () => {
    const llamada = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError({ message: "high demand", status: 503 }),
      )
      .mockResolvedValueOnce("ok");

    const resultado = await llamarConReintento(llamada);

    expect(resultado).toBe("ok");
    expect(llamada).toHaveBeenCalledTimes(2);
  });

  it("reintenta un 502 temporal del proveedor", async () => {
    const error = Object.assign(new Error("bad gateway"), { status: 502 });
    const llamada = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("ok");

    await expect(llamarConReintento(llamada)).resolves.toBe("ok");
    expect(llamada).toHaveBeenCalledTimes(2);
  });

  it("YA NO reintenta un 429 — el backoff es más corto que la ventana de RPM, así que solo desperdiciaría cuota", async () => {
    const llamada = vi
      .fn()
      .mockRejectedValue(
        new ApiError({ message: "rate limited", status: 429 }),
      );

    await expect(llamarConReintento(llamada)).rejects.toThrow();
    expect(llamada).toHaveBeenCalledTimes(1);
  });

  it("NO reintenta errores que no son transitorios (ej. 401 API key inválida)", async () => {
    const llamada = vi
      .fn()
      .mockRejectedValue(
        new ApiError({ message: "invalid api key", status: 401 }),
      );

    await expect(llamarConReintento(llamada)).rejects.toThrow();
    expect(llamada).toHaveBeenCalledTimes(1);
  });

  it("se rinde después de MAX_REINTENTOS (1) y deja que el error se propague — máx. 2 llamadas por interacción", async () => {
    const llamada = vi
      .fn()
      .mockRejectedValue(new ApiError({ message: "high demand", status: 503 }));

    await expect(llamarConReintento(llamada)).rejects.toThrow();
    expect(llamada).toHaveBeenCalledTimes(2); // intento inicial + 1 reintento, ni uno más
  });
});

describe("mensajeErrorIA", () => {
  it("nunca devuelve el JSON crudo del error — este es exactamente el bug del 24 sep 2026", () => {
    const errorCrudo = new ApiError({
      message:
        '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}',
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

  it("traduce un 502 sin mostrar el detalle técnico", () => {
    const mensaje = mensajeErrorIA(
      Object.assign(new Error("upstream detail"), { status: 502 }),
    );
    expect(mensaje.toLowerCase()).toContain("saturado");
    expect(mensaje).not.toContain("upstream detail");
  });

  it("da un mensaje genérico para cualquier otro error, sin leer su .message", () => {
    const mensaje = mensajeErrorIA(
      new Error("detalle técnico que no debe llegar al estudiante"),
    );
    expect(mensaje).not.toContain("detalle técnico");
  });
});
