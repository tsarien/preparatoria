import { describe, it, expect } from "vitest";
import { resolverEsOscuro, esTemaValido } from "./theme";

describe("resolverEsOscuro", () => {
  it("'oscuro' siempre es oscuro, sin importar el sistema", () => {
    expect(resolverEsOscuro("oscuro", false)).toBe(true);
    expect(resolverEsOscuro("oscuro", true)).toBe(true);
  });

  it("'claro' siempre es claro, sin importar el sistema", () => {
    expect(resolverEsOscuro("claro", true)).toBe(false);
    expect(resolverEsOscuro("claro", false)).toBe(false);
  });

  it("'sistema' sigue la preferencia del sistema operativo", () => {
    expect(resolverEsOscuro("sistema", true)).toBe(true);
    expect(resolverEsOscuro("sistema", false)).toBe(false);
  });
});

describe("esTemaValido", () => {
  it("acepta los 3 valores válidos", () => {
    expect(esTemaValido("claro")).toBe(true);
    expect(esTemaValido("oscuro")).toBe(true);
    expect(esTemaValido("sistema")).toBe(true);
  });

  it("rechaza cualquier otro valor", () => {
    expect(esTemaValido("azul")).toBe(false);
    expect(esTemaValido("")).toBe(false);
  });
});
