import { describe, expect, it } from "vitest";
import { validarCursoEstudiante, validarCursosDelColegio } from "./cursos";

const DISPONIBLES = ["10-A", "10-B", "11-A"];

describe("cursos del educador", () => {
  it("acepta cursos del colegio y devuelve el nombre canónico", () => {
    expect(validarCursosDelColegio(["10-a", "11-A", "10-A"], DISPONIBLES)).toEqual({
      cursos: ["10-A", "11-A"],
    });
  });
  it("rechaza cursos que no pertenecen al colegio", () => {
    expect(validarCursosDelColegio(["10-A", "99-Z"], DISPONIBLES).error).toMatch(
      /no pertenece/,
    );
  });
  it("exige al menos uno y limita la cantidad", () => {
    expect(validarCursosDelColegio([], DISPONIBLES).error).toMatch(/al menos/);
    const muchos = Array.from({ length: 11 }, (_, i) => `G${i}`);
    expect(validarCursosDelColegio(muchos, muchos).error).toMatch(/máximo/);
  });
});

describe("curso del estudiante", () => {
  it("con cursos configurados es obligatorio y debe pertenecer al colegio", () => {
    expect(validarCursoEstudiante("", DISPONIBLES).error).toMatch(/Selecciona/);
    expect(validarCursoEstudiante("1-Z", DISPONIBLES).error).toMatch(/no pertenece/);
    expect(validarCursoEstudiante("10-b", DISPONIBLES).curso).toBe("10-B");
  });
  it("sin cursos configurados queda vacío", () => {
    expect(validarCursoEstudiante("lo-que-sea", [])).toEqual({ curso: "" });
  });
});
