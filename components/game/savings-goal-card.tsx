import Image from "next/image";
import { CalendarClock, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavingsGoalCardProps {
  nombre: string;
  montoObjetivo: number;
  montoActual: number;
  aporteMensualPlaneado: number;
  /** Meses faltantes — null si aporte = 0, 0 si ya se alcanzó. */
  mesesFaltantes: number | null;
  /** XP informativo que se otorga al completar. */
  recompensaXp?: number;
  className?: string;
}

function formatearMoneda(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

/**
 * Deriva una etiqueta de fecha a partir de los meses ya calculados.
 * Es presentación pura — no inventa lógica nueva, solo formatea.
 */
function etiquetaFecha(meses: number | null): string | null {
  if (meses === null) return null;
  if (meses === 0) return "Alcanzada";
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Tarjeta visualmente protagonista del progreso hacia una meta de ahorro.
 * El progreso domina: barra grande con hitos 25/50/75 y cifras en font-mono.
 * Presentación pura; recibe los datos ya calculados.
 */
export function SavingsGoalCard({
  nombre,
  montoObjetivo,
  montoActual,
  aporteMensualPlaneado,
  mesesFaltantes,
  recompensaXp = 50,
  className,
}: SavingsGoalCardProps) {
  const alcanzada = montoActual >= montoObjetivo;
  const pct =
    montoObjetivo > 0
      ? Math.min(100, Math.round((montoActual / montoObjetivo) * 100))
      : 0;
  const restante = Math.max(0, montoObjetivo - montoActual);
  const fecha = etiquetaFecha(mesesFaltantes);

  return (
    <div
      className={cn(
        "game-card relative overflow-hidden rounded-3xl bg-paper-raised",
        alcanzada && "border-gold",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          alcanzada
            ? "bg-gold"
            : "bg-gradient-to-r from-primary via-primary to-[#00d9cc]",
        )}
      />

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {/* Encabezado */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2",
              alcanzada
                ? "border-gold bg-gold-soft"
                : "border-primary/40 bg-primary-soft",
            )}
          >
            <Image
              src="/iconos/icono-ahorro.png"
              alt=""
              width={200}
              height={160}
              className="h-8 w-auto"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              {alcanzada ? "Meta lograda" : "Tu meta"}
            </p>
            <h3 className="break-words font-display text-lg font-semibold leading-tight text-ink sm:text-xl">
              {nombre}
            </h3>
          </div>
          {alcanzada && (
            <span
              aria-hidden="true"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-paper bg-growth text-white"
            >
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
          )}
        </div>

        {/* Cifras protagonistas */}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Ahorrado
          </p>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className={cn(
                "font-mono text-3xl font-semibold leading-none text-ink sm:text-4xl",
                alcanzada && "text-growth",
              )}
            >
              {formatearMoneda(montoActual)}
            </span>
            <span className="font-mono text-sm text-ink-soft">
              / {formatearMoneda(montoObjetivo)}
            </span>
          </div>
        </div>

        {/* Barra con hitos */}
        <div className="flex flex-col gap-2">
          <div className="relative h-4 w-full overflow-hidden rounded-full border-2 border-ink/20 bg-ink/10">
            <div
              role="progressbar"
              aria-valuenow={montoActual}
              aria-valuemin={0}
              aria-valuemax={montoObjetivo}
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                alcanzada
                  ? "bg-gradient-to-r from-growth to-[#4ade80]"
                  : "bg-gradient-to-r from-primary via-primary to-[#00d9cc]",
              )}
              style={{ width: `${pct}%` }}
            />
            {/* Hitos 25 / 50 / 75 */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              {[25, 50, 75].map((mark) => (
                <span
                  key={mark}
                  style={{ left: `${mark}%` }}
                  className="absolute top-0 h-full w-px bg-paper-raised/60"
                />
              ))}
            </div>
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <span
              className={cn(
                "font-mono font-semibold",
                alcanzada ? "text-growth" : "text-primary",
              )}
            >
              {pct}%
            </span>
            {!alcanzada && (
              <span className="text-ink-soft">
                Falta{" "}
                <span className="font-mono font-medium text-ink">
                  {formatearMoneda(restante)}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Meta-info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-line pt-4 text-xs">
          {fecha && (
            <span className="inline-flex items-center gap-1.5 text-ink-soft">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {mesesFaltantes === 0 ? (
                <span className="font-medium text-growth">Alcanzada</span>
              ) : (
                <>
                  Estimado:{" "}
                  <span className="font-medium text-ink">{fecha}</span>
                </>
              )}
            </span>
          )}
          {!alcanzada && aporteMensualPlaneado > 0 && (
            <span className="text-ink-soft">
              Plan:{" "}
              <span className="font-mono font-medium text-ink">
                {formatearMoneda(aporteMensualPlaneado)}
              </span>
              /mes
            </span>
          )}
          {!alcanzada && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-gold bg-gold-soft px-2.5 py-0.5 font-semibold text-ink">
              <Sparkles className="h-3 w-3 text-gold" aria-hidden="true" />+
              {recompensaXp} XP al completar
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
