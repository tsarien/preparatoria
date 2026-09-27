import Image from "next/image";
import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  TrendingUp,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";

interface WalletHeroProps {
  saldo: number;
  salarioMensual: number;
  nivel: number;
  xpEnNivel: number;
  xpPorNivel: number;
  /** Sumas calculadas sobre los movimientos cargados en la página (últimos 20). */
  ingresos: number;
  gastos: number;
  ahorro: number;
  className?: string;
}

/**
 * Card principal de la billetera. Presenta el saldo del personaje como en un
 * inventario de videojuego: cifra protagonista, resumen de flujo (ingresos,
 * gastos, ahorro) y barra de nivel.
 *
 * IMPORTANTE: los totales de ingresos/gastos/ahorro son agregación de
 * PRESENTACIÓN sobre los movimientos que la página ya cargó. No representan
 * histórico completo — ver comentario en la página.
 */
export function WalletHero({
  saldo,
  salarioMensual,
  nivel,
  xpEnNivel,
  xpPorNivel,
  ingresos,
  gastos,
  ahorro,
  className,
}: WalletHeroProps) {
  const flujoNeto = ingresos - gastos;

  return (
    <div
      className={cn(
        "game-card relative overflow-hidden rounded-3xl bg-paper-raised",
        className,
      )}
    >
      {/* Franja de marca arriba */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary to-[#00d9cc]"
      />

      {/* Halo dorado detrás del saldo — refuerza "esto es lo tuyo" */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/15 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6">
        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <Image
            src="/iconos/icono-saldo.png"
            alt=""
            width={200}
            height={179}
            className="h-10 w-auto shrink-0"
          />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Mi billetera
          </p>
        </div>

        {/* Saldo */}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Saldo disponible
          </p>
          <p className="break-words font-mono text-4xl font-semibold leading-none text-ink sm:text-5xl">
            ${saldo.toLocaleString("es-CO")}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Salario mensual simulado ·{" "}
            <span className="font-mono font-medium text-ink">
              ${salarioMensual.toLocaleString("es-CO")}
            </span>
          </p>
        </div>

        {/* Resumen de flujo — 3 celdas */}
        <div className="grid grid-cols-3 gap-2">
          <FlujoCelda
            label="Ingresos"
            value={ingresos}
            tone="growth"
            Icon={ArrowUpRight}
          />
          <FlujoCelda
            label="Gastos"
            value={gastos}
            tone="alert"
            Icon={ArrowDownLeft}
          />
          <FlujoCelda
            label="Ahorro"
            value={ahorro}
            tone="gold"
            Icon={PiggyBank}
          />
        </div>

        {/* Neto de la ventana cargada */}
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
          <TrendingUp
            className={cn(
              "h-3.5 w-3.5",
              flujoNeto >= 0 ? "text-growth" : "text-alert",
            )}
            aria-hidden="true"
          />
          En tus últimos movimientos:{" "}
          <span
            className={cn(
              "font-mono font-semibold",
              flujoNeto >= 0 ? "text-growth" : "text-alert",
            )}
          >
            {flujoNeto >= 0 ? "+" : "−"}$
            {Math.abs(flujoNeto).toLocaleString("es-CO")}
          </span>
        </p>

        {/* Nivel */}
        <div className="flex flex-col gap-1.5 border-t-2 border-line pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-ink-soft">
              Nivel {nivel}
            </span>
            <span className="font-mono text-xs text-ink-soft">
              {xpEnNivel} / {xpPorNivel} XP
            </span>
          </div>
          <ProgressBar value={xpEnNivel} max={xpPorNivel} variant="xp" />
        </div>
      </div>
    </div>
  );
}

function FlujoCelda({
  label,
  value,
  tone,
  Icon,
}: {
  label: string;
  value: number;
  tone: "growth" | "alert" | "gold";
  Icon: typeof ArrowUpRight;
}) {
  const tones = {
    growth: "border-growth/40 bg-growth-soft text-growth",
    alert: "border-alert/40 bg-alert-soft text-alert",
    gold: "border-gold bg-gold-soft text-ink",
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border-2 px-2.5 py-2",
        tones[tone],
      )}
    >
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider opacity-90">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </span>
      <span className="break-words font-mono text-sm font-semibold leading-tight">
        ${value.toLocaleString("es-CO")}
      </span>
    </div>
  );
}
