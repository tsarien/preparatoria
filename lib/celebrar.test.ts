import { describe, it, expect } from "vitest";
import { debeCelebrar, PUNTAJE_CELEBRACION, marcarFeedbackReciente, consumirFeedbackReciente } from "./celebrar";

describe("debeCelebrar", () => {
  it("celebra justo en el umbral", () => {
    expect(debeCelebrar(PUNTAJE_CELEBRACION)).toBe(true);
  });

  it("no celebra un punto por debajo del umbral", () => {
    expect(debeCelebrar(PUNTAJE_CELEBRACION - 1)).toBe(false);
  });

  it("celebra el puntaje máximo y no celebra el mínimo", () => {
    expect(debeCelebrar(100)).toBe(true);
    expect(debeCelebrar(0)).toBe(false);
  });
});

function almacenFalso() {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  };
}

describe("marca de feedback reciente", () => {
  it("se consume una sola vez", () => {
    const a = almacenFalso();
    marcarFeedbackReciente("meta-de-ahorro", a);
    expect(consumirFeedbackReciente("meta-de-ahorro", a)).toBe(true);
    expect(consumirFeedbackReciente("meta-de-ahorro", a)).toBe(false);
  });

  it("no la consume otro reto, pero la marca igual se descarta", () => {
    const a = almacenFalso();
    marcarFeedbackReciente("meta-de-ahorro", a);
    expect(consumirFeedbackReciente("otro-reto", a)).toBe(false);
    expect(consumirFeedbackReciente("meta-de-ahorro", a)).toBe(false);
  });

  it("vence pasada la ventana", () => {
    const a = almacenFalso();
    marcarFeedbackReciente("meta-de-ahorro", a);
    expect(consumirFeedbackReciente("meta-de-ahorro", a, Date.now() + 3 * 60 * 1000)).toBe(false);
  });

  it("sin almacenamiento disponible no falla", () => {
    expect(() => marcarFeedbackReciente("x", null)).not.toThrow();
    expect(consumirFeedbackReciente("x", null)).toBe(false);
  });

  it("un valor corrupto no rompe nada", () => {
    const a = almacenFalso();
    a.setItem("preparatoria-feedback-reciente", "{no es json");
    expect(consumirFeedbackReciente("x", a)).toBe(false);
  });
});
