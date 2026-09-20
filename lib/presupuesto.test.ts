import { describe, it, expect } from "vitest";
import {
  validarDistribucion,
  calcularPuntajeGastosHormiga,
  ahorroPorGastosHormigaDetectados,
  totalSeleccionado,
  validarPresupuesto,
  type GastoHormigaItem,
  type PriorizarGastosItem,
} from "./presupuesto";

describe("validarDistribucion", () => {
  it("acepta una distribución que suma exactamente el salario", () => {
    const asignado = { Vivienda: 500000, Comida: 300000, Transporte: 100000, Ahorro: 200000, Ocio: 100000 };
    expect(validarDistribucion(asignado, 1_200_000)).toBe(true);
  });

  it("rechaza una distribución que deja plata sin asignar", () => {
    const asignado = { Vivienda: 500000, Comida: 300000 };
    expect(validarDistribucion(asignado, 1_200_000)).toBe(false);
  });

  it("rechaza una distribución que se pasa del salario", () => {
    const asignado = { Vivienda: 900000, Comida: 500000 };
    expect(validarDistribucion(asignado, 1_200_000)).toBe(false);
  });
});

const ITEMS_HORMIGA: GastoHormigaItem[] = [
  { id: "cafe", nombre: "Café diario", monto: 6000, es_hormiga: true },
  { id: "arriendo", nombre: "Arriendo", monto: 600000, es_hormiga: false },
  { id: "suscripcion", nombre: "Streaming sin usar", monto: 35000, es_hormiga: true },
  { id: "mercado", nombre: "Mercado del mes", monto: 250000, es_hormiga: false },
];

describe("calcularPuntajeGastosHormiga", () => {
  it("da 100 si acierta todos (marca los hormiga, deja los que no lo son)", () => {
    expect(calcularPuntajeGastosHormiga(["cafe", "suscripcion"], ITEMS_HORMIGA)).toBe(100);
  });

  it("da 0 si falla todos", () => {
    expect(calcularPuntajeGastosHormiga(["arriendo", "mercado"], ITEMS_HORMIGA)).toBe(0);
  });

  it("da el porcentaje correcto en un caso mixto (2 de 4)", () => {
    expect(calcularPuntajeGastosHormiga(["cafe", "arriendo"], ITEMS_HORMIGA)).toBe(50);
  });

  it("no marcar nada también cuenta los aciertos de las que NO son hormiga", () => {
    // No selecciona nada: acierta arriendo y mercado (no son hormiga y no los marcó),
    // falla cafe y suscripcion (eran hormiga y no los marcó) -> 2 de 4
    expect(calcularPuntajeGastosHormiga([], ITEMS_HORMIGA)).toBe(50);
  });
});

describe("ahorroPorGastosHormigaDetectados", () => {
  it("suma solo los montos de los hormiga correctamente detectados", () => {
    expect(ahorroPorGastosHormigaDetectados(["cafe", "suscripcion", "arriendo"], ITEMS_HORMIGA)).toBe(41000);
  });

  it("da 0 si no detectó ningún hormiga", () => {
    expect(ahorroPorGastosHormigaDetectados(["arriendo", "mercado"], ITEMS_HORMIGA)).toBe(0);
  });
});

const ITEMS_PRIORIZAR: PriorizarGastosItem[] = [
  { id: "zapatos", nombre: "Zapatos nuevos", monto: 80000 },
  { id: "salida", nombre: "Salida con amigos", monto: 50000 },
  { id: "curso", nombre: "Curso online", monto: 60000 },
];

describe("totalSeleccionado", () => {
  it("suma los montos de los ítems elegidos", () => {
    expect(totalSeleccionado(["zapatos", "salida"], ITEMS_PRIORIZAR)).toBe(130000);
  });

  it("da 0 si no seleccionó nada", () => {
    expect(totalSeleccionado([], ITEMS_PRIORIZAR)).toBe(0);
  });
});

describe("validarPresupuesto", () => {
  it("acepta una selección igual al presupuesto", () => {
    expect(validarPresupuesto(["zapatos", "salida"], ITEMS_PRIORIZAR, 130000)).toBe(true);
  });

  it("acepta una selección por debajo del presupuesto", () => {
    expect(validarPresupuesto(["salida"], ITEMS_PRIORIZAR, 130000)).toBe(true);
  });

  it("rechaza una selección que se pasa del presupuesto", () => {
    expect(validarPresupuesto(["zapatos", "curso"], ITEMS_PRIORIZAR, 100000)).toBe(false);
  });
});
