import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases condicionales (clsx) y resuelve conflictos de Tailwind (twMerge).
 * Úsala en cualquier componente que acepte una prop `className` opcional.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
