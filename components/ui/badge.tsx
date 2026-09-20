import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "tag" | "sello";
  tone?: "ink" | "primary" | "gold" | "growth" | "alert";
}

/**
 * variant="tag"   -> pastilla simple para estados (ej. "MVP", "Roadmap", "Pendiente")
 * variant="sello" -> el elemento firma del sistema: un "sello" circular de doble anillo,
 *                    ligeramente rotado, como un timbre oficial. Úsalo solo para logros
 *                    reales (nivel alcanzado, reto certificado) — no lo repitas como
 *                    decoración, pierde su significado si aparece en todas partes.
 */
export function Badge({ className, variant = "tag", tone = "ink", children, ...props }: BadgeProps) {
  const toneClasses: Record<string, string> = {
    ink: "border-ink/25 text-ink bg-ink/5",
    primary: "border-primary/30 text-primary bg-primary-soft",
    gold: "border-gold text-ink bg-gold-soft",
    growth: "border-growth/40 text-growth bg-growth-soft",
    alert: "border-alert/40 text-alert bg-alert-soft",
  };

  if (variant === "sello") {
    return (
      <span
        className={cn(
          "relative inline-flex h-16 w-16 shrink-0 -rotate-6 items-center justify-center rounded-full border-2 border-dashed p-1 font-display text-[10px] font-semibold uppercase leading-tight tracking-wide",
          toneClasses[tone],
          className
        )}
        {...props}
      >
        <span className="flex h-full w-full items-center justify-center rounded-full border border-current/40 text-center">
          {children}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
