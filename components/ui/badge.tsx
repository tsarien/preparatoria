import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "tag" | "sello" | "status";
type BadgeTone = "ink" | "primary" | "gold" | "growth" | "alert";
type StatusKind = "pending" | "active" | "completed" | "locked" | "difficulty";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  tone?: BadgeTone;
  /** Solo aplica con variant="status" — determina label y tone por defecto. */
  status?: StatusKind;
  /** Override del label por defecto del status. */
  label?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  ink: "border-ink/25 text-ink bg-ink/5",
  primary: "border-primary/30 text-primary bg-primary-soft",
  gold: "border-gold text-ink bg-gold-soft",
  growth: "border-growth/40 text-growth bg-growth-soft",
  alert: "border-alert/40 text-alert bg-alert-soft",
};

/**
 * Defaults por status. El tono se puede sobrescribir vía `tone`; el texto
 * vía `label`. "difficulty" no tiene un label canónico (varía por reto), así
 * que el default es genérico y siempre conviene pasar `label` explícito.
 */
const STATUS_CONFIG: Record<StatusKind, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pendiente", tone: "ink" },
  active: { label: "En curso", tone: "primary" },
  completed: { label: "Completado", tone: "growth" },
  locked: { label: "Bloqueado", tone: "ink" },
  difficulty: { label: "Dificultad", tone: "gold" },
};

/**
 * variant="tag"    -> pastilla simple para estados (ej. "MVP", "Roadmap")
 * variant="status" -> pastilla con label y color derivados de un estado
 *                     canónico (pending/active/completed/locked/difficulty).
 *                     Mismo look que "tag" — la diferencia es de contrato:
 *                     "status" garantiza coherencia de tono con el estado.
 * variant="sello"  -> el elemento firma del sistema: un "sello" circular de
 *                     doble anillo, ligeramente rotado, como un timbre oficial.
 *                     Úsalo solo para logros reales (nivel alcanzado, reto
 *                     certificado) — no lo repitas como decoración.
 */
export function Badge({
  className,
  variant = "tag",
  tone,
  status,
  label,
  children,
  ...props
}: BadgeProps) {
  if (variant === "sello") {
    return (
      <span
        className={cn(
          "relative inline-flex h-16 w-16 shrink-0 -rotate-6 items-center justify-center rounded-full border-2 border-dashed p-1 font-display text-[10px] font-semibold uppercase leading-tight tracking-wide",
          TONE_CLASSES[tone ?? "ink"],
          className,
        )}
        {...props}
      >
        <span className="flex h-full w-full items-center justify-center rounded-full border border-current/40 text-center">
          {children}
        </span>
      </span>
    );
  }

  if (variant === "status" && status) {
    const config = STATUS_CONFIG[status];
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
          TONE_CLASSES[tone ?? config.tone],
          className,
        )}
        {...props}
      >
        {label ?? config.label}
      </span>
    );
  }

  // Fallback: variant="status" sin `status` cae aquí — se comporta como tag.
  // Es preferible a crashear; si querías un status concreto, pásalo.
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone ?? "ink"],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
