import Image from "next/image";
import { GameStateBadge, type GameEstado } from "./game-state-badge";
import { GameBackButton } from "./game-back-button";
import { ProgressBar } from "@/components/ui/progress-bar";

interface GameMissionHeaderProps {
  volverHref: string;
  volverEtiqueta?: string;
  /** "DINERO", "SEGURIDAD DIGITAL"... siempre en MAYÚSCULAS por el chip. */
  categoria: string;
  /** "MISIÓN 01" o "DESAFÍO 1 DE 3" — opcional. */
  mision?: string;
  dificultad?: string;
  titulo: string;
  tagline?: string;
  icono?: string;
  estado?: GameEstado;
  progreso?: { completados: number; total: number; label?: string };
  recompensaXp?: number;
}

/** Mapeo puramente visual — no introduce ni interpreta lógica. */
function estrellas(dificultad?: string): { llenas: number; total: 3 } | null {
  if (!dificultad) return null;
  const normalizada = dificultad.toLowerCase();
  if (normalizada.includes("facil") || normalizada.includes("fácil"))
    return { llenas: 1, total: 3 };
  if (normalizada.includes("dificil") || normalizada.includes("difícil"))
    return { llenas: 3, total: 3 };
  return { llenas: 2, total: 3 }; // medio por defecto
}

/**
 * Cabecera de misión. Reemplaza al EncabezadoPagina dentro de los módulos.
 * Presenta la pantalla como misión de videojuego: chip de categoría + número,
 * icono en medallón, título grande, tagline, progreso y recompensa.
 *
 * Server Component: no tiene estado ni eventos.
 */
export function GameMissionHeader({
  volverHref,
  volverEtiqueta = "Volver al mapa",
  categoria,
  mision,
  dificultad,
  titulo,
  tagline,
  icono,
  estado,
  progreso,
  recompensaXp,
}: GameMissionHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <GameBackButton href={volverHref} label={volverEtiqueta} />

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
        <span className="rounded-md border border-primary/40 bg-primary-soft px-2 py-0.5 text-primary">
          {categoria}
        </span>
        {mision && <span className="text-ink-soft">{mision}</span>}
        {dificultad &&
          (() => {
            const r = estrellas(dificultad);
            if (!r) return null;
            return (
              <span
                className="inline-flex items-center gap-1 text-ink-soft"
                aria-label={`Dificultad ${dificultad}`}
                title={`Dificultad: ${dificultad}`}
              >
                <span aria-hidden="true" className="font-mono tracking-tighter">
                  {"★".repeat(r.llenas)}
                  <span className="text-ink-soft/40">
                    {"★".repeat(r.total - r.llenas)}
                  </span>
                </span>
                <span className="text-ink-soft/70">{dificultad}</span>
              </span>
            );
          })()}
        {estado && <GameStateBadge estado={estado} />}
      </div>

      <div className="flex items-start gap-4">
        {icono && (
          <div className="grid h-16 w-16 shrink-0 animate-pop place-items-center rounded-2xl border-2 border-primary/40 bg-primary-soft shadow-[0_3px_0_rgba(108,77,255,0.25)] sm:h-20 sm:w-20">
            <Image
              src={icono}
              alt=""
              width={200}
              height={170}
              className="h-auto w-3/4 object-contain"
            />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="break-words font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {titulo}
          </h1>
          {tagline && (
            <p className="text-sm text-ink-soft sm:text-base">{tagline}</p>
          )}
        </div>
      </div>

      {(progreso || recompensaXp !== undefined) && (
        <div className="flex flex-wrap items-center gap-3">
          {progreso && (
            <div className="min-w-[12rem] flex-1">
              <ProgressBar
                value={progreso.completados}
                max={progreso.total}
                label={progreso.label ?? "Misiones completadas"}
              />
            </div>
          )}
          {recompensaXp !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-gold bg-gold-soft px-3 py-1 text-xs font-semibold text-ink">
              <span className="font-mono">+{recompensaXp} XP</span>
            </span>
          )}
        </div>
      )}
    </header>
  );
}
