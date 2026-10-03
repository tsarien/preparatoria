import { describe, expect, it } from "vitest";
import { MODULOS_MVP, etiquetaMision, numeroMision } from "./modulos";

describe("numeración oficial de misiones", () => {
  it("respeta el orden 01–05 definido para el MVP", () => {
    expect(MODULOS_MVP.map((m) => m.slug)).toEqual([
      "presupuesto-personal",
      "ahorro-metas",
      "primer-empleo",
      "detectar-estafas",
      "contrato-arriendo",
    ]);
  });
  it("asigna cada número a su módulo", () => {
    expect(etiquetaMision("presupuesto-personal")).toBe("Misión 01");
    expect(etiquetaMision("ahorro-metas")).toBe("Misión 02");
    expect(etiquetaMision("primer-empleo")).toBe("Misión 03");
    expect(etiquetaMision("detectar-estafas")).toBe("Misión 04");
    expect(etiquetaMision("contrato-arriendo")).toBe("Misión 05");
  });
  it("no inventa números para slugs desconocidos", () => {
    expect(numeroMision("otro")).toBeNull();
    expect(etiquetaMision("otro")).toBe("");
  });
});
