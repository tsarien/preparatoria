// Tipos de la config (jsonb) de cada reto — ver supabase/migrations/0004_modulos_retos.sql

export interface GastoHormigaItem {
  id: string;
  nombre: string;
  monto: number;
  es_hormiga: boolean;
}

export interface PriorizarGastosItem {
  id: string;
  nombre: string;
  monto: number;
}

/** Reto 1 — Distribuye tu primer salario: la suma asignada debe calzar con el salario total. */
export function validarDistribucion(asignado: Record<string, number>, salarioTotal: number): boolean {
  const suma = Object.values(asignado).reduce((total, monto) => total + monto, 0);
  return suma === salarioTotal;
}

/** Reto 2 — Detecta los gastos hormiga: % de aciertos (marcó hormiga Y era hormiga, o no marcó Y no lo era). */
export function calcularPuntajeGastosHormiga(seleccionados: string[], items: GastoHormigaItem[]): number {
  if (items.length === 0) return 0;
  const aciertos = items.filter((item) => seleccionados.includes(item.id) === item.es_hormiga).length;
  return Math.round((aciertos / items.length) * 100);
}

/** Cuánto "se ahorra" el personaje por cada gasto hormiga que sí detectó correctamente. */
export function ahorroPorGastosHormigaDetectados(seleccionados: string[], items: GastoHormigaItem[]): number {
  return items
    .filter((item) => item.es_hormiga && seleccionados.includes(item.id))
    .reduce((total, item) => total + item.monto, 0);
}

/** Suma de los montos de los ítems seleccionados — se usa tanto para validar como para registrar transacciones. */
export function totalSeleccionado(
  seleccionados: string[],
  items: { id: string; monto: number }[]
): number {
  return items
    .filter((item) => seleccionados.includes(item.id))
    .reduce((total, item) => total + item.monto, 0);
}

/** Reto 3 — Prioriza tus gastos: lo elegido no puede superar el presupuesto disponible. */
export function validarPresupuesto(
  seleccionados: string[],
  items: PriorizarGastosItem[],
  presupuesto: number
): boolean {
  return totalSeleccionado(seleccionados, items) <= presupuesto;
}
