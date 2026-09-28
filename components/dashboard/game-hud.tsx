import Image from "next/image";
import Link from "next/link";
import { Settings, Sparkles, Trophy } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";

interface GameHUDProps {
  nombre: string;
  saldo: number;
  nivel: number;
  xpEnNivel: number;
  xpPorNivel: number;
}

/**
 * Barra HUD del dashboard. Reemplaza al antiguo header + card "Mi Vida Simulada".
 *
 * Layout:
 *   ≥lg → una sola fila: [identidad] [saldo] [nivel+xp] [guía] [ranking] [ajustes]
 *   <lg → dos filas:  [logo + saludo]  y  [stats + acciones]
 *
 * Es un Server Component a propósito: no tiene estado ni eventos.
 */
export function GameHUD({
  nombre,
  saldo,
  nivel,
  xpEnNivel,
  xpPorNivel,
}: GameHUDProps) {
  const inicial = nombre.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="game-hud relative overflow-hidden rounded-2xl">
      {/* Highlight superior tipo "bisel" */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
      />

      <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:gap-4">
        {/* Identidad */}
        <div className="flex min-w-0 items-center gap-3 lg:flex-1">
          <Image
            src="/logo-icon.png"
            alt=""
            width={400}
            height={355}
            className="hidden h-9 w-auto shrink-0 sm:block"
            priority
          />
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-gold/70 bg-primary-soft font-display text-base font-bold text-primary"
          >
            {inicial}
          </span>
          <p className="min-w-0 flex-1 wrap-break-word font-display text-base font-semibold leading-tight text-ink sm:text-lg">
            Hola, <span className="text-primary">{nombre}</span>
          </p>
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

        {/* Acciones */}
        <div className="flex items-center gap-2 lg:flex-none">
          <Link
            href="/dashboard/guia"
            className="game-chip flex h-10 items-center gap-2 rounded-xl border-2 border-primary/50 bg-primary-soft px-3 text-sm font-medium text-ink transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="hidden sm:inline">Guía</span>
          </Link>
          <Link
            href="/dashboard/ranking"
            className="game-chip flex h-10 items-center gap-2 rounded-xl border-2 border-gold/50 bg-gold-soft px-3 text-sm font-medium text-ink transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            <Trophy className="h-4 w-4 text-gold" aria-hidden="true" />
            <span className="hidden sm:inline">Ranking</span>
          </Link>
          <Link
            href="/dashboard/ajustes"
            aria-label="Perfil"
            className="game-chip grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-primary/30 bg-paper-raised text-ink-soft transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
