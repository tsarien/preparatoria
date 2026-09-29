import { describe, expect, it } from "vitest";
import {
  filtrarEstudiantes,
  resumirDatosEducativos,
  type EstudianteEducativo,
} from "./educacion";

const ESTUDIANTES: EstudianteEducativo[] = [
  {
    estudiante_id: "a",
    nombre: "Samuel",
    curso: "11-A",
    nivel: 2,
    xp: 700,
    retos_completados: 2,
    total_retos: 4,
    progreso_promedio: 50,
    progreso_modulos: [
      {
        slug: "presupuesto",
        nombre: "Presupuesto",
        total: 2,
        completados: 2,
        porcentaje: 100,
      },
      {
        slug: "ahorro",
        nombre: "Ahorro",
        total: 2,
        completados: 0,
        porcentaje: 0,
      },
    ],
    actividad_reciente: [],
  },
  {
    estudiante_id: "b",
    nombre: "Sara",
    curso: "10-B",
    nivel: 1,
    xp: 120,
    retos_completados: 1,
    total_retos: 4,
    progreso_promedio: 25,
    progreso_modulos: [
      {
        slug: "presupuesto",
        nombre: "Presupuesto",
        total: 2,
        completados: 1,
        porcentaje: 50,
      },
    ],
    actividad_reciente: [],
  },
];

describe("filtros educativos", () => {
  it("filtra por curso, nombre, módulo y estado", () => {
    expect(
      filtrarEstudiantes(ESTUDIANTES, {
        busqueda: "sam",
        curso: "11-A",
        modulo: "presupuesto",
        estado: "completado",
      }).map((estudiante) => estudiante.estudiante_id),
    ).toEqual(["a"]);
    expect(
      filtrarEstudiantes(ESTUDIANTES, {
        busqueda: "",
        curso: "",
        modulo: "ahorro",
        estado: "pendiente",
      }).map((estudiante) => estudiante.estudiante_id),
    ).toEqual(["a"]);
  });

  it("construye agregados educativos sin nombres ni identificadores", () => {
    const resumen = resumirDatosEducativos(ESTUDIANTES, "11-A");
    expect(resumen.progreso_promedio).toBe(38);
    expect(resumen.retos_completados).toBe(3);
    expect(Object.keys(resumen).sort()).toEqual([
      "curso",
      "progreso_modulos",
      "progreso_promedio",
      "retos_completados",
      "total_retos",
    ]);
    expect(JSON.stringify(resumen)).not.toContain("Samuel");
  });
});
