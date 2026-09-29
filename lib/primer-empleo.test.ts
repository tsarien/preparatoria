import { describe, expect, it } from "vitest";
import {
  calcularCompletitud,
  calcularPuntajeSenales,
  esOpcionValida,
  esRetoPrimerEmpleo,
  sanitizarTextoIA,
} from "./primer-empleo";

describe("primer empleo", () => {
  it("reconoce solo los cinco retos configurados", () => {
    expect(esRetoPrimerEmpleo("entrevista")).toBe(true);
    expect(esRetoPrimerEmpleo("reto-inventado")).toBe(false);
  });

  it("mide la completitud sin exigir experiencia laboral formal", () => {
    expect(
      calcularCompletitud(["Perfil", "Habilidades", "", "Proyecto", ""]),
    ).toBe(60);
    expect(calcularCompletitud([])).toBe(0);
  });

  it("puntúa señales de alerta y penaliza marcar señales incorrectas", () => {
    expect(
      calcularPuntajeSenales(["cobro", "claves"], ["cobro", "claves"]),
    ).toBe(100);
    expect(
      calcularPuntajeSenales(["cobro", "legitima"], ["cobro", "claves"]),
    ).toBe(50);
    expect(calcularPuntajeSenales([], ["cobro"])).toBe(0);
  });

  it("valida selecciones contra opciones conocidas", () => {
    expect(esOpcionValida("oferta-a", ["oferta-a", "oferta-b"])).toBe(true);
    expect(esOpcionValida("oferta-c", ["oferta-a", "oferta-b"])).toBe(false);
  });

  it("minimiza correo y teléfono antes de enviar respuestas a la IA", () => {
    expect(
      sanitizarTextoIA(
        "Mi correo es estudiante@example.com y mi número 3001234567",
      ),
    ).toBe("Mi correo es [correo omitido] y mi número [teléfono omitido]");
    expect(sanitizarTextoIA("x".repeat(30), 12)).toHaveLength(12);
  });
});
