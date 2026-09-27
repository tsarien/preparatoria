import { Circle, Play, Check, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type GameEstado =
  | "pendiente"
  | "en-progreso"
  | "completado"
  | "bloqueado"
  | "recompensa";

interface GameStateBadgeProps {
  estado: GameEstado;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

const CONFIG: Record<
  GameEstado,
  { Icon: typeof Check; defaultLabel: string; tone: string }
> = {
  pendiente: {
    Icon: Circle,
    defaultLabel: "Pendiente",
    tone: "border-ink/25 bg-ink/5 text-ink-soft",
  },
  "en-progreso": {
    Icon: Play,
    defaultLabel: "En progreso",
    tone: "border-primary bg-primary-soft text-primary",
  },
  completado: {
    Icon: Check,
    defaultLabel: "Completado",
    tone: "border-growth bg-growth-soft text-growth",
  },
  bloqueado: {
    Icon: Lock,
    defaultLabel: "Bloqueado",
    tone: "border-ink/30 bg-ink/10 text-ink-soft",
  },
  recompensa: {
    Icon: Sparkles,
    defaultLabel: "Recompensa",
    tone: "border-gold bg-gold-soft text-ink",
  },
};

/**
 * Pastilla de estado de misión. SIEMPRE icono + texto — el color por sí solo
 * no comunica el estado (accesibilidad para usuarios daltónicos).
 */
export function GameStateBadge({
  estado,
  label,
  size = "sm",
  className,
}: GameStateBadgeProps) {
  const { Icon, defaultLabel, tone } = CONFIG[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 font-semibold",
        size === "sm" && "px-2 py-0.5 text-[10px] uppercase tracking-wide",
        size === "md" && "px-2.5 py-1 text-xs",
        tone,
        className,
      )}
    >
      <Icon
        className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"}
        aria-hidden="true"
      />
      {label ?? defaultLabel}
    </span>
  );
}
