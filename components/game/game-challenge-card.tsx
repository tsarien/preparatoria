import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { GameStateBadge, type GameEstado } from "./game-state-badge";
import { cn } from "@/lib/utils";

interface GameChallengeCardProps {
  href: string;
  numero: number;
  titulo: string;
  dificultad: string;
  completado: boolean;
  puntaje?: number | null;
  etiquetaCompletado?: string;
  bloqueado?: boolean;
  index?: number;
}

/**
 * Tarjeta de desafío. Se ve como una "quest card": medallón grande con número
 * (o check), título, dificultad, estado y chevron. Hover eleva la tarjeta.
 */
export function GameChallengeCard({
  href,
  numero,
  titulo,
  dificultad,
  completado,
  puntaje,
  etiquetaCompletado = "Completado",
  bloqueado = false,
  index = 0,
}: GameChallengeCardProps) {
  const estado: GameEstado = bloqueado
    ? "bloqueado"
    : completado
      ? "completado"
      : "pendiente";

  const contenido = (
    <div
      className={cn(
        "game-card flex items-center justify-between gap-3 rounded-2xl bg-paper-raised p-4 transition-transform duration-200 motion-reduce:transition-none",
        !bloqueado && "hover:-translate-y-0.5",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 font-display text-base font-bold shadow-[0_3px_0_rgba(31,36,48,0.15)]",
            completado && "border-growth bg-growth-soft text-growth",
            !completado &&
              !bloqueado &&
              "border-primary/40 bg-primary-soft text-primary",
            bloqueado && "border-ink/25 bg-ink/10 text-ink-soft",
          )}
        >
          {completado ? <Check className="h-5 w-5" strokeWidth={3} /> : numero}
        </span>

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="break-words font-display text-base font-semibold leading-tight text-ink">
            {titulo}
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs text-ink-soft">
              Dificultad: {dificultad}
            </span>
            <GameStateBadge
              estado={estado}
              label={
                completado
                  ? `${etiquetaCompletado} · ${puntaje ?? 0}/100`
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {!bloqueado && (
        <ChevronRight
          className="h-5 w-5 shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
      )}
    </div>
  );

  const anim = { animationDelay: `${Math.min(index, 8) * 70}ms` };

  if (bloqueado) {
    return (
      <li className="animate-fade-up opacity-70" style={anim}>
        {contenido}
      </li>
    );
  }

  return (
    <li className="animate-fade-up" style={anim}>
      <Link
        href={href}
        className="group block rounded-2xl"
        aria-label={`${titulo} — dificultad ${dificultad}`}
      >
        {contenido}
      </Link>
    </li>
  );
}
