import { describe, it, expect } from "vitest";
import {
  calcularPuntajeClausulas,
  calcularPuntajePreguntas,
  calcularPuntajeContrato,
  type Clausula,
  type Pregunta,
} from "./contrato";

const CLAUSULAS: Clausula[] = [
  { id: "canon", texto: "Canon mensual", preocupante: false },
  { id: "incremento", texto: "Incremento IPC+3", preocupante: true },
  { id: "reparaciones", texto: "Reparaciones a cargo del arrendatario", preocupante: true },
  { id: "duracion", texto: "Duración 12 meses", preocupante: false },
];

describe("calcularPuntajeClausulas", () => {
  it("da 100 si marca exactamente las preocupantes", () => {
    expect(calcularPuntajeClausulas(["incremento", "reparaciones"], CLAUSULAS)).toBe(100);
  });

  it("da 0 si marca las que no son preocupantes y deja las que sí lo son", () => {
    expect(calcularPuntajeClausulas(["canon", "duracion"], CLAUSULAS)).toBe(0);
  });

  it("da el porcentaje correcto en un caso mixto (3 de 4)", () => {
    expect(calcularPuntajeClausulas(["incremento"], CLAUSULAS)).toBe(75);
  });
});

const PREGUNTAS: Pregunta[] = [
  { id: "q1", texto: "¿Canon?", opciones: ["a", "b", "c"], respuesta_correcta: 1 },
  { id: "q2", texto: "¿Aviso?", opciones: ["a", "b", "c"], respuesta_correcta: 0 },
];

describe("calcularPuntajePreguntas", () => {
  it("da 100 si acierta todas", () => {
    expect(calcularPuntajePreguntas({ q1: 1, q2: 0 }, PREGUNTAS)).toBe(100);
  });

  it("da 50 si acierta la mitad", () => {
    expect(calcularPuntajePreguntas({ q1: 1, q2: 2 }, PREGUNTAS)).toBe(50);
  });

  it("da 0 si no respondió nada", () => {
    expect(calcularPuntajePreguntas({}, PREGUNTAS)).toBe(0);
  });
});

describe("calcularPuntajeContrato", () => {
  it("promedia los dos puntajes", () => {
    expect(calcularPuntajeContrato(100, 50)).toBe(75);
  });

  it("redondea el resultado", () => {
    expect(calcularPuntajeContrato(100, 75)).toBe(88);
  });
});
