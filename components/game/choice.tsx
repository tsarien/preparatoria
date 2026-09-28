"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameChoiceProps {
  /** Identificador — se renderiza como `value` si el grupo es un form. */
  value: string;
  /** Nombre del grupo (todos los hijos del mismo grupo comparten esto). */
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Contenido libre (texto + emoji/icono). Se ajusta al ancho disponible. */
  children: ReactNode;
  /** Contenido a la derecha (ej. monto en un gasto). */
  trailing?: ReactNode;
}

/**
 * Tarjeta seleccionable. Reemplaza el bloque `sr-only input + <span Check>`
 * que hoy se repite en SignalsInvestigation, PriorizarGastosForm y
 * GastosHormigaForm. Sigue funcionando con forms: si `name` está presente,
 * renderiza un input real (sr-only) con ese nombre y el `value`.
 */
export function GameChoice({
  value,
  name,
  checked,
  onChange,
  disabled,
  children,
  trailing,
}: GameChoiceProps) {
  return (
    <label
      className={cn(
        "press flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors duration-150",
        checked
          ? "border-gold bg-gold-soft"
          : "border-line bg-paper-raised hover:border-primary/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {name && (
        <input
          type="checkbox"
          name={name}
          value={value}
          checked={checked}
          onChange={() => !disabled && onChange(!checked)}
          disabled={disabled}
          className="sr-only"
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 transition-colors",
          checked
            ? "border-gold bg-gold text-[#1f2430]"
            : "border-line bg-paper",
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 break-words text-sm text-ink">
        {children}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </label>
  );
}

interface GameChoiceGroupProps {
  titulo: string;
  children: ReactNode;
  /** Layout: 1 columna (default) o 2 columnas (sm+). */
  layout?: "stack" | "grid";
}

export function GameChoiceGroup({
  titulo,
  children,
  layout = "stack",
}: GameChoiceGroupProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-semibold text-ink">{titulo}</p>
      <div
        className={cn(
          "flex flex-col gap-2",
          layout === "grid" && "sm:grid sm:grid-cols-2",
        )}
      >
        {children}
      </div>
    </div>
  );
}
