import { Trophy, Medal, Award, Crown } from "lucide-react";
import { AvatarUsuario } from "@/components/avatar-usuario";
import { cn } from "@/lib/utils";

interface RankPlayerRowProps {
  posicion: number;
  nombre: string;
  /** avatar_id del jugador (inválido o nulo → avatar_01). */
  avatarId?: string | null;
  curso: string | null;
  nivel: number;
  xp: number;
  esUsuarioActual: boolean;
  /** Total a mostrar en el progreso del badge de XP (para referencia visual). */
  xpMaximo?: number;
}

const MEDALLAS = [
  {
    Icon: Crown,
    tone: "border-gold bg-gold-soft text-[#8a5a00]",
    label: "1er puesto",
  },
  {
    Icon: Medal,
    tone: "border-ink/30 bg-[#e6e6ee] text-[#4a4a5c]",
    label: "2do puesto",
  },
  {
    Icon: Award,
    tone: "border-[#c08457] bg-[#f7e4d4] text-[#8a4a1e]",
    label: "3er puesto",
  },
] as const;

/**
 * Fila de jugador del ranking. En el top 3 se ve con medalla pixel-art
 * (icono Lucide dentro de un medallón con borde). Del 4 en adelante muestra
 * el número en un círculo limpio.
 *
 * Presentación pura.
 */
export function RankPlayerRow({
  posicion,
  nombre,
  avatarId,
  curso,
  nivel,
  xp,
  esUsuarioActual,
  xpMaximo,
}: RankPlayerRowProps) {
  const medalla = posicion <= 3 ? MEDALLAS[posicion - 1] : null;

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-3 py-3 sm:px-4",
        esUsuarioActual && "bg-gold-soft/60",
      )}
      aria-current={esUsuarioActual ? "true" : undefined}
    >
      {/* Posición: medalla o número */}
      <span
        aria-label={`Posición ${posicion}`}
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 font-display text-base font-bold shadow-[0_3px_0_rgba(31,36,48,0.15)]",
          medalla
            ? medalla.tone
            : "border-primary/30 bg-primary-soft text-primary",
        )}
      >
        {medalla ? (
          <medalla.Icon className="h-5 w-5" aria-hidden="true" />
        ) : (
          <span className="font-mono">{posicion}</span>
        )}
      </span>

      {/* Avatar + identidad */}
      <AvatarUsuario
        avatarId={avatarId}
        tamano={40}
        className={esUsuarioActual ? "border-gold" : "border-primary/40"}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="break-words text-sm font-semibold text-ink">
            {nombre}
          </span>
          {esUsuarioActual && (
            <span className="rounded-full border-2 border-gold bg-gold-soft px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink">
              Tú
            </span>
          )}
        </span>
        {curso && <span className="text-[11px] text-ink-soft">{curso}</span>}
      </div>

      {/* Nivel + XP */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-1 rounded-full border-2 border-primary/30 bg-primary-soft px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wide text-primary">
          <Trophy className="h-3 w-3" aria-hidden="true" />
          Nv {nivel}
        </span>
        <span className="font-mono text-xs font-medium text-ink-soft">
          {xp.toLocaleString("es-CO")} XP
        </span>
        {xpMaximo !== undefined && xpMaximo > 0 && (
          <div
            aria-hidden="true"
            className="h-1 w-16 overflow-hidden rounded-full bg-ink/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[#00d9cc]"
              style={{ width: `${Math.min(100, (xp / xpMaximo) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </li>
  );
}
