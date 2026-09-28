import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MyRankCardProps {
  posicion: number | null; // null = fuera del top 50 / sin colegio
  nombre: string;
  nivel: number;
  xp: number;
  enTop50: boolean;
  totalJugadores: number;
  className?: string;
}

/**
 * Card destacada con MI posición en el ranking. Se muestra siempre — si estoy
 * fuera del top 50 (o la RPC no devolvió nada), se ve con estado "sin
 * clasificar" en vez de un ranking inventado.
 */
export function MyRankCard({
  posicion,
  nombre,
  nivel,
  xp,
  enTop50,
  totalJugadores,
  className,
}: MyRankCardProps) {
  const inicial = nombre.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "game-card relative overflow-hidden rounded-3xl border-2 border-gold bg-gold-soft",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gold/30 blur-3xl"
      />

      <div className="relative flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <Image
            src="/iconos/icono-ranking.png"
            alt=""
            width={200}
            height={169}
            className="h-8 w-auto"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Tu posición
          </span>
        </div>

        {enTop50 && posicion !== null ? (
          <div className="flex items-end gap-4">
            <span className="font-mono text-5xl font-bold leading-none text-ink">
              #{posicion}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 pb-1">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-gold bg-paper-raised font-display text-xs font-bold text-ink"
                >
                  {inicial}
                </span>
                <span className="wrap-break-word text-sm font-semibold text-ink">
                  {nombre}
                </span>
              </span>
              <span className="text-xs text-ink-soft">
                de {totalJugadores} en tu colegio
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="font-display text-2xl font-semibold text-ink">
              Aún sin clasificar
            </span>
            <span className="text-xs text-ink-soft">
              {totalJugadores > 0
                ? `Estás fuera del top ${totalJugadores} de tu colegio — sigue jugando.`
                : "Necesitas compañeros de colegio para aparecer en el ranking."}
            </span>
          </div>
        )}

        {/* Stats rápidas */}
        <div className="grid grid-cols-2 gap-2 border-t-2 border-gold/40 pt-4">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              <Trophy className="h-3 w-3" aria-hidden="true" />
              Nivel
            </span>
            <span className="font-mono text-xl font-semibold text-ink">
              {nivel}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              XP total
            </span>
            <span className="font-mono text-xl font-semibold text-ink">
              {xp.toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="group inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink transition-colors hover:text-primary"
        >
          Ir a mis misiones
          <ArrowRight
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}
