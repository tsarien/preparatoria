import { describe, expect, it } from "vitest";
import { anioColombia, esPeriodoValido, etiquetaPeriodo } from "./periodos";

describe("periodos académicos", () => {
  it("solo acepta los valores definidos (no texto libre)", () => {
    expect(esPeriodoValido("periodo_1")).toBe(true);
    expect(esPeriodoValido("Septiembre 2026")).toBe(false);
    expect(esPeriodoValido("")).toBe(false);
  });
  it("genera la etiqueta con el año de Colombia", () => {
    expect(etiquetaPeriodo("periodo_3", new Date("2026-10-01T12:00:00Z"))).toBe(
      "Tercer periodo 2026",
    );
    expect(etiquetaPeriodo("hack")).toBeNull();
  });
  it("usa la zona horaria de Bogotá en el cambio de año", () => {
    // 1 ene 2027 02:00 UTC = 31 dic 2026 21:00 en Bogotá
    expect(anioColombia(new Date("2027-01-01T02:00:00Z"))).toBe(2026);
  });
});
