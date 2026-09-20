import { describe, it, expect } from "vitest";
import { calcularNivel, xpEnNivelActual, subioDeNivel, XP_POR_NIVEL } from "./gamification";

describe("calcularNivel", () => {
  it("empieza en nivel 1 con 0 XP", () => {
    expect(calcularNivel(0)).toBe(1);
  });

  it("se queda en nivel 1 justo antes del umbral", () => {
    expect(calcularNivel(XP_POR_NIVEL - 1)).toBe(1);
  });

  it("sube a nivel 2 exactamente en el umbral", () => {
    expect(calcularNivel(XP_POR_NIVEL)).toBe(2);
  });

  it("calcula niveles altos correctamente", () => {
    expect(calcularNivel(XP_POR_NIVEL * 9)).toBe(10);
  });

  it("rechaza XP negativo", () => {
    expect(() => calcularNivel(-1)).toThrow();
  });
});

describe("xpEnNivelActual", () => {
  it("es igual al XP total dentro del nivel 1", () => {
    expect(xpEnNivelActual(320)).toBe(320);
  });

  it("se reinicia a 0 justo al subir de nivel", () => {
    expect(xpEnNivelActual(XP_POR_NIVEL)).toBe(0);
  });

  it("refleja el progreso dentro del nivel 2", () => {
    expect(xpEnNivelActual(XP_POR_NIVEL + 150)).toBe(150);
  });
});

describe("subioDeNivel", () => {
  it("detecta un cambio de nivel", () => {
    expect(subioDeNivel(490, 510)).toBe(true);
  });

  it("no marca cambio de nivel si sigue en el mismo nivel", () => {
    expect(subioDeNivel(100, 200)).toBe(false);
  });

  it("no marca cambio de nivel si el XP no cambió", () => {
    expect(subioDeNivel(500, 500)).toBe(false);
  });
});
