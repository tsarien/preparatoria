import type { ReactNode } from "react";
import { GameModuleShell } from "./game-module-shell";
import { GameMissionHeader } from "./game-mission-header";
import { GameRewardBanner } from "./game-reward-banner";
import { Card } from "@/components/ui/card";

interface GameChallengeShellProps {
  volverHref: string;
  volverEtiqueta?: string;
  categoria: string;
  mision?: string;
  dificultad?: string;
  titulo: string;
  tagline?: string;
  icono?: string;
  completado?: boolean;
  recompensaXp?: number;
  recompensaDinero?: number;
  children: ReactNode;
}

/**
 * Envoltorio completo de un desafío individual. Encapsula el patrón repetido
 * en los 7 retos del MVP: <main> con atmósfera → cabecera de misión →
 * Card con el contenido → franja de recompensa (si aún no está completado).
 *
 * Server Component.
 */
export function GameChallengeShell({
  volverHref,
  volverEtiqueta,
  categoria,
  mision,
  dificultad,
  titulo,
  tagline,
  icono,
  completado = false,
  recompensaXp,
  recompensaDinero,
  children,
}: GameChallengeShellProps) {
  const mostrarRecompensa =
    !completado &&
    (recompensaXp !== undefined || recompensaDinero !== undefined);

  return (
    <GameModuleShell ancho="compacto">
      <GameMissionHeader
        volverHref={volverHref}
        volverEtiqueta={volverEtiqueta}
        categoria={categoria}
        mision={mision}
        dificultad={dificultad}
        titulo={titulo}
        tagline={tagline}
        icono={icono}
        estado={completado ? "completado" : undefined}
      />

      <Card tone="game">{children}</Card>

      {mostrarRecompensa && (
        <GameRewardBanner
          xp={recompensaXp}
          dinero={recompensaDinero}
          mensaje="Al completar esta misión"
        />
      )}
    </GameModuleShell>
  );
}
