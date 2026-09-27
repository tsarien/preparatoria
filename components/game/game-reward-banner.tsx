import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameRewardBannerProps {
  xp?: number;
  dinero?: number;
  mensaje?: string;
  activo?: boolean;
  className?: string;
}

/**
 * Franja de recompensa. Se muestra al pie de un desafío para anticipar lo que
 * se gana al completarlo, o arriba del feedback para confirmar lo ganado.
 * Siempre icono + texto; el color es refuerzo, no la única señal.
 */
export function GameRewardBanner({
  xp,
  dinero,
  mensaje,
  activo = true,
  className,
}: GameRewardBannerProps) {
  if (xp === undefined && dinero === undefined && !mensaje) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border-2 px-4 py-3",
        activo ? "border-gold bg-gold-soft" : "border-line bg-paper-raised",
        className,
      )}
    >
      <Sparkles
        className={cn(
          "h-5 w-5 shrink-0",
          activo ? "text-gold" : "text-ink-soft",
        )}
        aria-hidden="true"
      />
      {mensaje && (
        <span className="text-sm font-medium text-ink">{mensaje}</span>
      )}
      {xp !== undefined && (
        <span className="rounded-full bg-paper-raised px-2.5 py-0.5 font-mono text-xs font-semibold text-ink">
          +{xp} XP
        </span>
      )}
      {dinero !== undefined && (
        <span className="rounded-full bg-paper-raised px-2.5 py-0.5 font-mono text-xs font-semibold text-ink">
          +${dinero.toLocaleString("es-CO")}
        </span>
      )}
    </div>
  );
}
