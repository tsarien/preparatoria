import { describe, expect, it } from "vitest";
import {
  extraerInforme,
  informeATexto,
  validarPreguntaEducativa,
} from "./ia-educativa";

const INFORME = {
  observacion: "El grupo avanza de forma pareja.",
  fortalezas: ["Constancia"],
  aspectos_por_reforzar: [],
  recomendaciones: ["Repasar ahorro"],
  actividades_sugeridas: ["Retos en parejas"],
};

describe("IA educativa: texto e informe", () => {
  it("convierte el informe a texto omitiendo listas vacías", () => {
    const texto = informeATexto(INFORME);
    expect(texto).toContain("Observación: El grupo avanza de forma pareja.");
    expect(texto).toContain("Fortalezas observadas:\n- Constancia");
    expect(texto).not.toContain("Aspectos por reforzar");
  });
  it("recupera el informe estructurado solo si el JSON guardado es válido", () => {
    expect(extraerInforme({ informe: INFORME })).toEqual(INFORME);
    expect(extraerInforme({ informe: { observacion: 1 } })).toBeNull();
    expect(extraerInforme(null)).toBeNull();
    expect(extraerInforme({ informe: { ...INFORME, fortalezas: [1] } })).toBeNull();
  });
  it("valida la longitud de la pregunta", () => {
    expect(validarPreguntaEducativa("corta")).toMatch(/concreta/);
    expect(validarPreguntaEducativa("x".repeat(501))).toMatch(/500/);
    expect(validarPreguntaEducativa("¿Qué debería repasar con 10-A?")).toBeNull();
  });
});
