import Image from "next/image";
import Link from "next/link";
import { Settings, Sparkles, Trophy, Wallet } from "lucide-react";
import { AvatarUsuario } from "@/components/avatar-usuario";
import { BotonCerrarSesion } from "@/components/boton-cerrar-sesion";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";

interface GameHUDProps {
  nombre: string;
  /** avatar_id guardado en el perfil (se resuelve con resolverAvatar; inválido → avatar_01). */
  avatarId?: string | null;
  saldo: number;
  nivel: number;
  xpEnNivel: number;
  xpPorNivel: number;
  /**
   * Modo demostración del educador: sin ranking (los educadores nunca participan en él) y sin
   * "Cerrar sesión" propio (la cabecera educativa del layout ya lo trae).
   */
  modoDemo?: boolean;
}

const ACCION =
  "game-chip press flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border-2 text-sm font-medium text-ink transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none sm:w-auto sm:px-3";

/**
 * Barra HUD del dashboard.
 *
 * Layout (apilado SIEMPRE, para que el nombre nunca quede sin ancho):
 *   fila 1 · [avatar + "Hola, nombre"]  y a la derecha (≥sm) las acciones
 *   fila 2 · [saldo] [nivel + XP]
 *   <sm    · las acciones bajan a su propia fila (solo iconos)
 *
 * Antes la identidad iba en una fila con `min-w-0` + `flex-1` junto a los chips y botones: en
 * pantallas angostas el bloque del nombre se encogía a casi 0 px y `overflow-wrap` partía el texto
 * letra por letra (vertical). Ahora el nombre ocupa su propia línea, se ajusta en 2 líneas como
 * máximo y NUNCA se parte en vertical.
 *
 * Es un Server Component a propósito: no tiene estado ni eventos.
 */
export function GameHUD({
  nombre,
  avatarId,
  saldo,
  nivel,
  xpEnNivel,
  xpPorNivel,
  modoDemo = false,
}: GameHUDProps) {
  return (
    <header
      data-testid="game-hud"
      className="game-hud relative overflow-hidden rounded-2xl"
    >
      {/* Highlight superior tipo "bisel" */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
      />

      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Identidad */}
          <div className="flex min-w-0 items-center gap-3 sm:flex-1">
            <Image
              src="/logo-icon.png"
              alt=""
              width={400}
              height={355}
              className="hidden h-9 w-auto shrink-0 md:block"
              priority
            />
            <AvatarUsuario
              avatarId={avatarId}
              tamano={44}
              className="border-gold/70"
            />
            <p
              data-testid="hud-nombre"
              className="min-w-0 flex-1 font-display text-base font-semibold leading-tight text-ink sm:text-lg"
            >
              <span className="block text-xs font-medium text-ink-soft">Hola,</span>
              <span
                title={nombre}
                className="line-clamp-2 break-words text-primary [overflow-wrap:break-word]"
              >
                {nombre}
              </span>
            </p>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
            <Link
              href="/dashboard/billetera"
              aria-label="Ver billetera completa"
              title="Ver billetera completa"
              className={cn(ACCION, "border-turquoise/60 bg-turquoise-soft")}
            >
              <Wallet className="h-4 w-4 text-turquoise" aria-hidden="true" />
              <span className="hidden sm:inline">Billetera</span>
            </Link>
            <Link
              href="/dashboard/guia"
              aria-label="Guía"
              title="Guía"
              className={cn(ACCION, "border-primary/50 bg-primary-soft")}
            >
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="hidden sm:inline">Guía</span>
            </Link>
            {!modoDemo && (
              <Link
                href="/dashboard/ranking"
                aria-label="Ranking"
                title="Ranking"
                className={cn(ACCION, "border-gold/50 bg-gold-soft")}
              >
                <Trophy className="h-4 w-4 text-gold" aria-hidden="true" />
                <span className="hidden sm:inline">Ranking</span>
              </Link>
            )}
            <Link
              href="/dashboard/ajustes"
              aria-label="Ajustes"
              title="Ajustes"
              className={cn(ACCION, "border-primary/30 bg-paper-raised text-ink-soft")}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ajustes</span>
            </Link>
            {!modoDemo && <BotonCerrarSesion />}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-stretch gap-2">
          {/* Saldo */}
          <div className="game-chip flex items-center gap-2 rounded-xl border-2 border-gold/50 bg-gold-soft px-2.5 py-1.5">
            <Image
              src="/iconos/icono-saldo.png"
              alt=""
              width={200}
              height={179}
              className="h-6 w-auto shrink-0"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">
                Saldo
              </span>
              <span className="font-mono text-sm font-semibold text-ink">
                ${saldo.toLocaleString("es-CO")}
              </span>
            </div>
          </div>

          {/* Nivel + XP */}
          <div className="game-chip flex min-w-[9rem] flex-1 items-center gap-2 rounded-xl border-2 border-primary/40 bg-primary-soft px-2.5 py-1.5">
            <span
              aria-hidden="true"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold text-xs font-bold text-[#1f2430]"
            >
              {nivel}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 leading-tight">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">
                  Nivel {nivel}
                </span>
                <span className="font-mono text-[10px] text-ink-soft">
                  {xpEnNivel}/{xpPorNivel}
                </span>
              </div>
              <ProgressBar value={xpEnNivel} max={xpPorNivel} variant="xp" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
