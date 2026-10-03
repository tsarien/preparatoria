import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases condicionales (clsx) y resuelve conflictos de Tailwind (twMerge).
 * Úsala en cualquier componente que acepte una prop `className` opcional.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** true si el texto tiene forma de UUID (se valida antes de usarlo en una consulta). */
export const esUuid = (valor: string): boolean => REGEX_UUID.test(valor);
