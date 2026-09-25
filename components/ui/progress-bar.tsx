import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  className?: string;
  /** Opt-in: la barra "se llena" desde 0 al aparecer. Apagado por defecto para no
   *  cambiar las pantallas que ya usan la barra sin este efecto. */
  animado?: boolean;
}

/**
 * Barra de progreso para XP, metas de ahorro, avance de un reto, etc.
 * Las cifras van en font-mono a propósito: es el mismo tratamiento que
 * usamos para montos de dinero, para que "progreso" y "plata" se lean
 * con la misma voz visual en toda la app.
 */
export function ProgressBar({ value, max, label, className, animado = false }: ProgressBarProps) {
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
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-300",
            animado && "animate-bar-fill"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
