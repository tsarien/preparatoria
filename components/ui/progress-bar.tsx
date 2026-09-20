import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  className?: string;
}

/**
 * Barra de progreso para XP, metas de ahorro, avance de un reto, etc.
 * Las cifras van en font-mono a propósito: es el mismo tratamiento que
 * usamos para montos de dinero, para que "progreso" y "plata" se lean
 * con la misma voz visual en toda la app.
 */
export function ProgressBar({ value, max, label, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs font-medium text-ink-soft">{label}</span>
          <span className="font-mono text-xs tabular-nums text-ink-soft">
            {value.toLocaleString("es-CO")} / {max.toLocaleString("es-CO")}
          </span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2 w-full overflow-hidden rounded-full bg-ink/10"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
