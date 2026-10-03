/**
 * ORDEN OFICIAL de los módulos MVP — ÚNICA fuente de la numeración de misiones.
 *
 *   01 Presupuesto personal · 02 Ahorro con metas · 03 Primer empleo
 *   04 Detectar estafas     · 05 Contrato de arriendo
 *
 * El mapa del dashboard recorre este arreglo en orden y cada página de módulo obtiene su
 * "Misión 0N" con etiquetaMision(slug). No escribas el número a mano en las páginas: así el
 * mapa, las cabeceras y los subretos no se desfasan cuando cambie el orden. Los slugs internos
 * (rutas y filas de la base de datos) no cambian.
 */
export const MODULOS_MVP = [
  {
    slug: "presupuesto-personal",
    grupo: "Dinero",
    nombre: "Presupuesto personal",
    icono: "/iconos/icono-presupuesto.png",
    disponible: true,
  },
  {
    slug: "ahorro-metas",
    grupo: "Dinero",
    nombre: "Ahorro con metas",
    icono: "/iconos/icono-ahorro.png",
    disponible: true,
  },
  {
    slug: "primer-empleo",
    grupo: "Vida profesional",
    nombre: "Primer empleo",
    icono: "/iconos/icono-empleo.png",
    disponible: true,
  },
  {
    slug: "detectar-estafas",
    grupo: "Seguridad digital",
    nombre: "Detectar estafas",
    icono: "/iconos/icono-seguridad.png",
    disponible: true,
  },
  {
    slug: "contrato-arriendo",
    grupo: "Vida independiente",
    nombre: "Contrato de arriendo",
    icono: "/iconos/icono-contrato.png",
    disponible: true,
  },
] as const;

export type SlugModuloMvp = (typeof MODULOS_MVP)[number]["slug"];

/** Número de misión (1..5) de un módulo, o null si el slug no es del MVP. */
export function numeroMision(slug: string): number | null {
  const indice = MODULOS_MVP.findIndex((modulo) => modulo.slug === slug);
  return indice >= 0 ? indice + 1 : null;
}

/** "Misión 02", "Misión 04"… (cadena vacía si el slug no es del MVP). */
export function etiquetaMision(slug: string): string {
  const numero = numeroMision(slug);
  return numero === null ? "" : `Misión ${String(numero).padStart(2, "0")}`;
}
