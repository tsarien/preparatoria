import type {
  CategoriaTicket,
  EstadoTicket,
  PrioridadTicket,
} from "@/types/database";

export const CATEGORIAS_TICKET: { valor: CategoriaTicket; etiqueta: string }[] = [
  { valor: "cuenta", etiqueta: "Mi cuenta" },
  { valor: "error_tecnico", etiqueta: "Algo no funciona" },
  { valor: "ia", etiqueta: "IA Guía / tutor" },
  { valor: "contenido", etiqueta: "Retos y contenido" },
  { valor: "sugerencia", etiqueta: "Sugerencia" },
  { valor: "otro", etiqueta: "Otro" },
];

export const PRIORIDADES_TICKET: { valor: PrioridadTicket; etiqueta: string }[] = [
  { valor: "baja", etiqueta: "Baja" },
  { valor: "media", etiqueta: "Media" },
  { valor: "alta", etiqueta: "Alta" },
  { valor: "urgente", etiqueta: "Urgente" },
];

export const ESTADOS_TICKET: { valor: EstadoTicket; etiqueta: string }[] = [
  { valor: "abierto", etiqueta: "Abierto" },
  { valor: "en_proceso", etiqueta: "En proceso" },
  { valor: "respondido", etiqueta: "Respondido" },
  { valor: "cerrado", etiqueta: "Cerrado" },
];

export const LIMITES_TICKET = {
  asuntoMin: 3,
  asuntoMax: 120,
  descripcionMin: 10,
  descripcionMax: 2000,
  mensajeMax: 2000,
  paginaMax: 200,
} as const;

export const esCategoriaTicket = (v: string): v is CategoriaTicket =>
  CATEGORIAS_TICKET.some((c) => c.valor === v);
export const esPrioridadTicket = (v: string): v is PrioridadTicket =>
  PRIORIDADES_TICKET.some((p) => p.valor === v);
export const esEstadoTicket = (v: string): v is EstadoTicket =>
  ESTADOS_TICKET.some((e) => e.valor === v);

export const etiquetaEstado = (v: string) =>
  ESTADOS_TICKET.find((e) => e.valor === v)?.etiqueta ?? v;
export const etiquetaPrioridad = (v: string) =>
  PRIORIDADES_TICKET.find((p) => p.valor === v)?.etiqueta ?? v;
export const etiquetaCategoria = (v: string) =>
  CATEGORIAS_TICKET.find((c) => c.valor === v)?.etiqueta ?? v;

/** Solo rutas internas ("/dashboard/…"); cualquier otra cosa se descarta. */
export function sanitizarPagina(valor: string): string | null {
  const limpio = valor.trim();
  if (!limpio.startsWith("/") || limpio.startsWith("//")) return null;
  if (/[\s<>"'`\\]/.test(limpio)) return null;
  return limpio.slice(0, LIMITES_TICKET.paginaMax);
}

export interface DatosTicket {
  asunto: string;
  categoria: string;
  descripcion: string;
  prioridad: string;
  pagina: string;
}

export function validarTicket(datos: DatosTicket): string | null {
  const asunto = datos.asunto.trim();
  const descripcion = datos.descripcion.trim();
  if (asunto.length < LIMITES_TICKET.asuntoMin || asunto.length > LIMITES_TICKET.asuntoMax)
    return `El asunto debe tener entre ${LIMITES_TICKET.asuntoMin} y ${LIMITES_TICKET.asuntoMax} caracteres.`;
  if (!esCategoriaTicket(datos.categoria)) return "Selecciona una categoría.";
  if (!esPrioridadTicket(datos.prioridad)) return "Selecciona una prioridad.";
  if (
    descripcion.length < LIMITES_TICKET.descripcionMin ||
    descripcion.length > LIMITES_TICKET.descripcionMax
  )
    return `Describe el problema (entre ${LIMITES_TICKET.descripcionMin} y ${LIMITES_TICKET.descripcionMax} caracteres).`;
  return null;
}

export function validarMensajeTicket(mensaje: string): string | null {
  const limpio = mensaje.trim();
  if (!limpio) return "Escribe un mensaje.";
  if (limpio.length > LIMITES_TICKET.mensajeMax)
    return `El mensaje no puede superar ${LIMITES_TICKET.mensajeMax} caracteres.`;
  return null;
}
